// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title DisputeArbitrator — Timelock Escrow + Multi-Sig Dispute Resolution
/// @notice Handles shift disputes (no-show, late clock-in) with AI-proposed
///         resolutions and a human appeal path via Safe multi-sig DAO.
/// @dev Escrowed funds are locked for a timelock period during which the AI
///      agent may propose a resolution. If unchallenged, the resolution
///      executes automatically. The multi-sig can override at any time.
contract DisputeArbitrator is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────
    // Custom Errors
    // ──────────────────────────────────────
    error Dispute__DisputeNotFound(uint256 disputeId);
    error Dispute__DisputeNotActive(uint256 disputeId);
    error Dispute__AlreadyResolved(uint256 disputeId);
    error Dispute__TimelockNotExpired(uint256 disputeId, uint256 unlocksAt);
    error Dispute__OnlyAIAgent();
    error Dispute__OnlyMultiSig();
    error Dispute__InvalidResolution();
    error Dispute__ZeroAmount();

    // ──────────────────────────────────────
    // Enums
    // ──────────────────────────────────────

    enum DisputeStatus { None, Active, AIResolved, Executed, Overridden, Cancelled }

    enum ResolutionType { None, PayFacility, PayStaff, SplitFiftyFifty, Custom }

    // ──────────────────────────────────────
    // Structs
    // ──────────────────────────────────────

    struct Dispute {
        uint256 shiftId;
        address facility;
        address staff;
        uint256 escrowAmount;
        IERC20 token;
        string reason;           // e.g. "Staff no-show", "Late clock-in"
        uint256 createdAt;
        uint256 aiResolutionDeadline;
        DisputeStatus status;
        // AI resolution
        address aiAgent;
        ResolutionType proposedResolution;
        uint256 facilityPayout;
        uint256 staffPayout;
        uint256 proposedAt;
        string evidence;
    }

    // ──────────────────────────────────────
    // State
    // ──────────────────────────────────────

    uint256 private s_nextDisputeId;

    /// @notice Dispute ID → Dispute data
    mapping(uint256 => Dispute) private s_disputes;

    /// @notice The authorized AI agent address
    address public aiAgent;

    /// @notice The Safe multi-sig (DAO) address for human appeals
    address public multiSig;

    /// @notice Default timelock duration (in seconds) before auto-execution
    uint256 public timelockDuration;

    /// @notice Maximum resolution deadline for AI agent
    uint256 public maxResolutionTime;

    // ──────────────────────────────────────
    // Events
    // ──────────────────────────────────────

    event DisputeFiled(
        uint256 indexed disputeId,
        uint256 indexed shiftId,
        address indexed facility,
        address staff,
        uint256 escrowAmount
    );

    event AIResolutionProposed(
        uint256 indexed disputeId,
        address aiAgent,
        ResolutionType resolutionType,
        uint256 facilityPayout,
        uint256 staffPayout
    );

    event ResolutionExecuted(
        uint256 indexed disputeId,
        uint256 facilityPayout,
        uint256 staffPayout
    );

    event ResolutionOverridden(
        uint256 indexed disputeId,
        address indexed multiSig,
        string reason
    );

    event DisputeCancelled(uint256 indexed disputeId);

    event ConfigUpdated(
        address aiAgent,
        address multiSig,
        uint256 timelockDuration,
        uint256 maxResolutionTime
    );

    // ──────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────

    constructor(
        address _aiAgent,
        address _multiSig,
        uint256 _timelockDuration,
        uint256 _maxResolutionTime
    ) Ownable(msg.sender) {
        require(_aiAgent != address(0), "Arb: zero AI agent");
        require(_multiSig != address(0), "Arb: zero multiSig");
        aiAgent = _aiAgent;
        multiSig = _multiSig;
        timelockDuration = _timelockDuration;
        maxResolutionTime = _maxResolutionTime;
    }

    // ──────────────────────────────────────
    // Modifiers
    // ──────────────────────────────────────

    modifier onlyAIAgent() {
        if (msg.sender != aiAgent) revert Dispute__OnlyAIAgent();
        _;
    }

    modifier onlyMultiSig() {
        if (msg.sender != multiSig) revert Dispute__OnlyMultiSig();
        _;
    }

    modifier disputeExists(uint256 disputeId) {
        if (disputeId >= s_nextDisputeId) revert Dispute__DisputeNotFound(disputeId);
        _;
    }

    modifier disputeActive(uint256 disputeId) {
        if (s_disputes[disputeId].status != DisputeStatus.Active) {
            revert Dispute__DisputeNotActive(disputeId);
        }
        _;
    }

    // ──────────────────────────────────────
    // Dispute Filing
    // ──────────────────────────────────────

    /// @notice File a new dispute and escrow funds. Callable by anyone.
    /// @param shiftId  The off-chain shift ID.
    /// @param staff  Address of the staff member.
    /// @param token  ERC20 token used for escrow.
    /// @param escrowAmount  Amount of tokens to escrow.
    /// @param reason  Human-readable reason for the dispute.
    function fileDispute(
        uint256 shiftId,
        address staff,
        IERC20 token,
        uint256 escrowAmount,
        string calldata reason
    )
        external
        nonReentrant
        returns (uint256 disputeId)
    {
        require(staff != address(0), "Arb: zero staff");
        require(address(token) != address(0), "Arb: zero token");
        if (escrowAmount == 0) revert Dispute__ZeroAmount();

        disputeId = s_nextDisputeId;
        s_nextDisputeId++;

        s_disputes[disputeId] = Dispute({
            shiftId: shiftId,
            facility: msg.sender,
            staff: staff,
            escrowAmount: escrowAmount,
            token: token,
            reason: reason,
            createdAt: block.timestamp,
            aiResolutionDeadline: block.timestamp + maxResolutionTime,
            status: DisputeStatus.Active,
            aiAgent: aiAgent,
            proposedResolution: ResolutionType.None,
            facilityPayout: 0,
            staffPayout: 0,
            proposedAt: 0,
            evidence: ""
        });

        // Escrow the disputed funds
        token.safeTransferFrom(msg.sender, address(this), escrowAmount);

        emit DisputeFiled(disputeId, shiftId, msg.sender, staff, escrowAmount);
    }

    // ──────────────────────────────────────
    // AI Resolution
    // ──────────────────────────────────────

    /// @notice AI agent proposes a resolution for an active dispute.
    /// @param disputeId  The dispute to resolve.
    /// @param facilityPayout  Amount to pay the facility.
    /// @param staffPayout  Amount to pay the staff member.
    /// @param resolutionType  Type of resolution.
    /// @param evidence  IPFS URI or hash of AI reasoning and evidence.
    function proposeResolution(
        uint256 disputeId,
        uint256 facilityPayout,
        uint256 staffPayout,
        ResolutionType resolutionType,
        string calldata evidence
    )
        external
        onlyAIAgent
        disputeExists(disputeId)
        disputeActive(disputeId)
    {
        Dispute storage dispute = s_disputes[disputeId];

        if (facilityPayout + staffPayout != dispute.escrowAmount) {
            revert Dispute__InvalidResolution();
        }

        dispute.status = DisputeStatus.AIResolved;
        dispute.proposedResolution = resolutionType;
        dispute.facilityPayout = facilityPayout;
        dispute.staffPayout = staffPayout;
        dispute.proposedAt = block.timestamp;
        dispute.evidence = evidence;

        emit AIResolutionProposed(
            disputeId,
            aiAgent,
            resolutionType,
            facilityPayout,
            staffPayout
        );
    }

    /// @notice Execute the AI-proposed resolution after the timelock expires.
    ///         Anyone may call to trigger execution.
    function executeResolution(uint256 disputeId)
        external
        disputeExists(disputeId)
        nonReentrant
    {
        Dispute storage dispute = s_disputes[disputeId];
        if (dispute.status != DisputeStatus.AIResolved) {
            revert Dispute__DisputeNotActive(disputeId);
        }
        if (block.timestamp < dispute.proposedAt + timelockDuration) {
            revert Dispute__TimelockNotExpired(
                disputeId,
                dispute.proposedAt + timelockDuration
            );
        }

        dispute.status = DisputeStatus.Executed;

        if (dispute.facilityPayout > 0) {
            dispute.token.safeTransfer(dispute.facility, dispute.facilityPayout);
        }
        if (dispute.staffPayout > 0) {
            dispute.token.safeTransfer(dispute.staff, dispute.staffPayout);
        }

        emit ResolutionExecuted(disputeId, dispute.facilityPayout, dispute.staffPayout);
    }

    // ──────────────────────────────────────
    // Multi-Sig Override (Human Appeal)
    // ──────────────────────────────────────

    /// @notice Multi-sig DAO overrides the AI resolution at any time.
    ///         Funds are distributed according to the override parameters.
    function overrideResolution(
        uint256 disputeId,
        uint256 facilityPayout,
        uint256 staffPayout,
        string calldata reason
    )
        external
        onlyMultiSig
        disputeExists(disputeId)
        nonReentrant
    {
        Dispute storage dispute = s_disputes[disputeId];
        if (
            dispute.status != DisputeStatus.Active &&
            dispute.status != DisputeStatus.AIResolved
        ) {
            revert Dispute__AlreadyResolved(disputeId);
        }

        if (facilityPayout + staffPayout != dispute.escrowAmount) {
            revert Dispute__InvalidResolution();
        }

        dispute.status = DisputeStatus.Overridden;
        dispute.facilityPayout = facilityPayout;
        dispute.staffPayout = staffPayout;

        if (facilityPayout > 0) {
            dispute.token.safeTransfer(dispute.facility, facilityPayout);
        }
        if (staffPayout > 0) {
            dispute.token.safeTransfer(dispute.staff, staffPayout);
        }

        emit ResolutionOverridden(disputeId, multiSig, reason);
    }

    // ──────────────────────────────────────
    // Cancellation
    // ──────────────────────────────────────

    /// @notice The facility (dispute filer) may cancel an active dispute.
    function cancelDispute(uint256 disputeId)
        external
        disputeExists(disputeId)
        disputeActive(disputeId)
        nonReentrant
    {
        Dispute storage dispute = s_disputes[disputeId];
        require(msg.sender == dispute.facility, "Arb: only facility");

        dispute.status = DisputeStatus.Cancelled;
        dispute.token.safeTransfer(dispute.facility, dispute.escrowAmount);

        emit DisputeCancelled(disputeId);
    }

    // ──────────────────────────────────────
    // Query Functions
    // ──────────────────────────────────────

    function getDispute(uint256 disputeId)
        external
        view
        disputeExists(disputeId)
        returns (Dispute memory)
    {
        return s_disputes[disputeId];
    }

    function getDisputeCount() external view returns (uint256) {
        return s_nextDisputeId;
    }

    function isTimelockExpired(uint256 disputeId)
        external
        view
        disputeExists(disputeId)
        returns (bool)
    {
        Dispute storage dispute = s_disputes[disputeId];
        if (dispute.status != DisputeStatus.AIResolved) return false;
        return block.timestamp >= dispute.proposedAt + timelockDuration;
    }

    // ──────────────────────────────────────
    // Admin — Configuration
    // ──────────────────────────────────────

    function setConfig(
        address _aiAgent,
        address _multiSig,
        uint256 _timelockDuration,
        uint256 _maxResolutionTime
    ) external onlyOwner {
        require(_aiAgent != address(0), "Arb: zero AI agent");
        require(_multiSig != address(0), "Arb: zero multiSig");
        aiAgent = _aiAgent;
        multiSig = _multiSig;
        timelockDuration = _timelockDuration;
        maxResolutionTime = _maxResolutionTime;
        emit ConfigUpdated(_aiAgent, _multiSig, _timelockDuration, _maxResolutionTime);
    }
}
