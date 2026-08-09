// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ShiftNFT — Soulbound ERC-721 for Healthcare Shift Assignments
/// @notice Non-transferable NFTs representing completed or assigned shifts.
///         Tokens are minted on shift assignment and updated on completion.
/// @dev Tokens are soulbound: cannot be transferred or approved once minted.
contract ShiftNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    // ──────────────────────────────────────
    // Custom Errors (gas-efficient)
    // ──────────────────────────────────────
    error ShiftNFT__TokenSoulbound();
    error ShiftNFT__ShiftAlreadyCompleted(uint256 tokenId);
    error ShiftNFT__InvalidShiftId();
    error ShiftNFT__NotShiftParticipant(uint256 tokenId);

    // ──────────────────────────────────────
    // Structs
    // ──────────────────────────────────────

    struct Shift {
        uint256 shiftId;
        address staff;
        uint256 startedAt;
        uint256 completedAt;
        string role;       // e.g. "ICU Nurse", "ER Physician"
        string department;
        bool isCompleted;
    }

    // ──────────────────────────────────────
    // State
    // ──────────────────────────────────────

    /// @notice Shift ID → Shift metadata
    mapping(uint256 => Shift) private s_shifts;

    /// @notice Staff address → array of shift token IDs
    mapping(address => uint256[]) private s_staffShiftHistory;

    /// @notice Incrementing shift counter
    uint256 private s_nextShiftId;

    /// @notice Address authorized to mint (the AI agent or admin contract)
    address public minter;

    // ──────────────────────────────────────
    // Events
    // ──────────────────────────────────────

    event ShiftMinted(
        uint256 indexed tokenId,
        uint256 indexed shiftId,
        address indexed staff,
        string role,
        uint256 startedAt
    );

    event ShiftCompleted(
        uint256 indexed tokenId,
        uint256 indexed shiftId,
        address indexed staff,
        uint256 completedAt
    );

    event MinterUpdated(address indexed oldMinter, address indexed newMinter);

    // ──────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────

    constructor(address _initialMinter)
        ERC721("Aegis Shift Badge", "SHIFT")
        Ownable(msg.sender)
    {
        require(_initialMinter != address(0), "ShiftNFT: zero minter");
        minter = _initialMinter;
    }

    // ──────────────────────────────────────
    // Modifiers
    // ──────────────────────────────────────

    modifier onlyMinterOrOwner() {
        require(
            msg.sender == minter || msg.sender == owner(),
            "ShiftNFT: not authorized"
        );
        _;
    }

    // ──────────────────────────────────────
    // Core Functions
    // ──────────────────────────────────────

    /// @notice Mint a new shift NFT for a staff member (soulbound).
    /// @param staff  Address of the healthcare worker.
    /// @param shiftId  Off-chain shift identifier (from backend).
    /// @param tokenURI  IPFS URI with shift metadata.
    /// @param role  Role description (e.g. "ICU Nurse").
    /// @param department  Department name.
    function mintShiftNFT(
        address staff,
        uint256 shiftId,
        string calldata tokenURI,
        string calldata role,
        string calldata department
    )
        external
        onlyMinterOrOwner
        nonReentrant
        returns (uint256 tokenId)
    {
        require(staff != address(0), "ShiftNFT: zero staff address");
        require(bytes(role).length > 0, "ShiftNFT: empty role");

        tokenId = s_nextShiftId;
        s_nextShiftId++;

        _safeMint(staff, tokenId);
        _setTokenURI(tokenId, tokenURI);

        s_shifts[tokenId] = Shift({
            shiftId: shiftId,
            staff: staff,
            startedAt: block.timestamp,
            completedAt: 0,
            role: role,
            department: department,
            isCompleted: false
        });

        s_staffShiftHistory[staff].push(tokenId);

        emit ShiftMinted(tokenId, shiftId, staff, role, block.timestamp);
    }

    /// @notice Mark a shift as completed. Only callable by minter/owner.
    /// @param tokenId  The NFT token ID representing the shift.
    function completeShift(uint256 tokenId)
        external
        onlyMinterOrOwner
        nonReentrant
    {
        if (_ownerOf(tokenId) == address(0)) revert ShiftNFT__InvalidShiftId();

        Shift storage shift = s_shifts[tokenId];
        if (shift.isCompleted) revert ShiftNFT__ShiftAlreadyCompleted(tokenId);

        shift.isCompleted = true;
        shift.completedAt = block.timestamp;

        emit ShiftCompleted(
            tokenId,
            shift.shiftId,
            shift.staff,
            block.timestamp
        );
    }

    // ──────────────────────────────────────
    // Query Functions
    // ──────────────────────────────────────

    /// @notice Retrieve a single shift's full metadata.
    function getShift(uint256 tokenId)
        external
        view
        returns (Shift memory)
    {
        if (_ownerOf(tokenId) == address(0)) revert ShiftNFT__InvalidShiftId();
        return s_shifts[tokenId];
    }

    /// @notice Retrieve all shift token IDs for a staff member.
    function getShiftHistory(address staff)
        external
        view
        returns (uint256[] memory)
    {
        return s_staffShiftHistory[staff];
    }

    /// @notice Get the number of shifts for a staff member.
    function getShiftCount(address staff) external view returns (uint256) {
        return s_staffShiftHistory[staff].length;
    }

    /// @notice Check if a shift has been completed.
    function isShiftCompleted(uint256 tokenId) external view returns (bool) {
        return s_shifts[tokenId].isCompleted;
    }

    // ──────────────────────────────────────
    // Admin
    // ──────────────────────────────────────

    /// @notice Update the minter address (AI agent or admin contract).
    function setMinter(address _newMinter) external onlyOwner {
        require(_newMinter != address(0), "ShiftNFT: zero address");
        address old = minter;
        minter = _newMinter;
        emit MinterUpdated(old, _newMinter);
    }

    // ──────────────────────────────────────
    // Soulbound Overrides — block transfers
    // ──────────────────────────────────────

    /// @dev Override _update to prevent transfers after minting.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        override(ERC721)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        // Allow minting (from == address(0)) but block any transfer
        if (from != address(0) && to != address(0)) {
            revert ShiftNFT__TokenSoulbound();
        }
        return super._update(to, tokenId, auth);
    }

    /// @dev Block approvals (soulbound — no transfers possible).
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert ShiftNFT__TokenSoulbound();
    }

    /// @dev Block setApprovalForAll (soulbound — no transfers possible).
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert ShiftNFT__TokenSoulbound();
    }
}
