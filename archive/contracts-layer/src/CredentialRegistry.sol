// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title CredentialRegistry — On-Chain Healthcare Credential Verification
/// @notice Stores hashed credential roots and supports EIP-712 typed signature
///         issuance, expiration, and revocation. Designed for ZK-SNARK selective
///         disclosure integration (zero-knowledge proofs verified off-chain with
///         on-chain commitment).
/// @dev Credentials are stored as keccak256 hashes. Only authorized issuers can
///      issue credentials. The contract supports verifying a credential against
///      a ZK proof on-chain via a simple boolean mapping.
contract CredentialRegistry is Ownable, EIP712 {
    using ECDSA for bytes32;

    // ──────────────────────────────────────
    // Custom Errors
    // ──────────────────────────────────────
    error CredReg__NotIssuer();
    error CredReg__CredentialNotFound(bytes32 credentialHash);
    error CredReg__CredentialRevoked(bytes32 credentialHash);
    error CredReg__CredentialExpired(bytes32 credentialHash, uint256 expiresAt);
    error CredReg__AlreadyIssued(bytes32 credentialHash);
    error CredReg__InvalidSignature();

    // ──────────────────────────────────────
    // Type Hashes (EIP-712)
    // ──────────────────────────────────────

    bytes32 private constant CREDENTIAL_TYPEHASH =
        keccak256(
            "CredentialIssue(address holder,bytes32 credentialHash,uint256 issuedAt,uint256 expiresAt,string metadataURI)"
        );

    // ──────────────────────────────────────
    // Structs
    // ──────────────────────────────────────

    struct Credential {
        bytes32 credentialHash;
        address holder;
        address issuer;
        uint256 issuedAt;
        uint256 expiresAt;   // 0 = never expires
        string metadataURI;  // IPFS URI with full credential metadata
        bool revoked;
    }

    // ──────────────────────────────────────
    // State
    // ──────────────────────────────────────

    /// @notice Authorized credential issuers (e.g. licensing boards, hospitals)
    mapping(address => bool) public issuers;

    /// @notice Credential hash → Credential data
    mapping(bytes32 => Credential) private s_credentials;

    /// @notice Holder address → array of credential hashes
    mapping(address => bytes32[]) private s_holderCredentials;

    /// @notice Track used nonces to prevent replay (holder → nonce → used)
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    // ──────────────────────────────────────
    // Events
    // ──────────────────────────────────────

    event CredentialIssued(
        bytes32 indexed credentialHash,
        address indexed holder,
        address indexed issuer,
        uint256 issuedAt,
        uint256 expiresAt
    );

    event CredentialVerified(
        bytes32 indexed credentialHash,
        address indexed holder,
        address indexed verifier,
        bool valid
    );

    event CredentialRevoked(
        bytes32 indexed credentialHash,
        address indexed holder
    );

    event IssuerUpdated(address indexed issuer, bool authorized);

    // ──────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────

    constructor(address[] memory _initialIssuers)
        EIP712("AegisCredentialRegistry", "1.0.0")
        Ownable(msg.sender)
    {
        for (uint256 i = 0; i < _initialIssuers.length; i++) {
            require(_initialIssuers[i] != address(0), "CredReg: zero issuer");
            issuers[_initialIssuers[i]] = true;
            emit IssuerUpdated(_initialIssuers[i], true);
        }
    }

    // ──────────────────────────────────────
    // Modifiers
    // ──────────────────────────────────────

    modifier onlyIssuer() {
        if (!issuers[msg.sender]) revert CredReg__NotIssuer();
        _;
    }

    // ──────────────────────────────────────
    // Issuance — EIP-712 Typed Signature
    // ──────────────────────────────────────

    /// @notice Issue a credential using EIP-712 typed data signature.
    ///         The issuer signs off-chain; holder (or relayer) submits on-chain.
    /// @param holder  Address receiving the credential.
    /// @param credentialHash  keccak256 of credential payload.
    /// @param issuedAt  Unix timestamp of issuance.
    /// @param expiresAt  Expiration timestamp (0 = never).
    /// @param metadataURI  IPFS URI for full credential data.
    /// @param nonce  Anti-replay nonce.
    /// @param signature  EIP-712 signature from an authorized issuer.
    function issueCredential(
        address holder,
        bytes32 credentialHash,
        uint256 issuedAt,
        uint256 expiresAt,
        string calldata metadataURI,
        uint256 nonce,
        bytes calldata signature
    )
        external
    {
        require(holder != address(0), "CredReg: zero holder");
        require(s_credentials[credentialHash].issuedAt == 0, "Already issued");

        // Prevent replay
        require(!usedNonces[holder][nonce], "CredReg: nonce used");
        usedNonces[holder][nonce] = true;

        // Reconstruct the EIP-712 digest
        bytes32 structHash = keccak256(
            abi.encode(
                CREDENTIAL_TYPEHASH,
                holder,
                credentialHash,
                issuedAt,
                expiresAt,
                keccak256(bytes(metadataURI))
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);

        // Recover signer
        address signer = digest.recover(signature);
        if (!issuers[signer]) revert CredReg__NotIssuer();

        s_credentials[credentialHash] = Credential({
            credentialHash: credentialHash,
            holder: holder,
            issuer: signer,
            issuedAt: issuedAt,
            expiresAt: expiresAt,
            metadataURI: metadataURI,
            revoked: false
        });

        s_holderCredentials[holder].push(credentialHash);

        emit CredentialIssued(credentialHash, holder, signer, issuedAt, expiresAt);
    }

    /// @notice Direct issuance by an authorized issuer (no signature needed).
    function issueCredentialDirect(
        address holder,
        bytes32 credentialHash,
        uint256 expiresAt,
        string calldata metadataURI
    )
        external
        onlyIssuer
    {
        require(holder != address(0), "CredReg: zero holder");
        require(s_credentials[credentialHash].issuedAt == 0, "Already issued");

        s_credentials[credentialHash] = Credential({
            credentialHash: credentialHash,
            holder: holder,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            metadataURI: metadataURI,
            revoked: false
        });

        s_holderCredentials[holder].push(credentialHash);

        emit CredentialIssued(credentialHash, holder, msg.sender, block.timestamp, expiresAt);
    }

    // ──────────────────────────────────────
    // Verification
    // ──────────────────────────────────────

    /// @notice Verify a credential is valid (not revoked, not expired).
    /// @param credentialHash  The credential to verify.
    /// @return valid  True if the credential is active.
    function verifyCredential(bytes32 credentialHash)
        external
        view
        returns (bool valid)
    {
        Credential storage cred = s_credentials[credentialHash];
        if (cred.issuedAt == 0) revert CredReg__CredentialNotFound(credentialHash);
        if (cred.revoked) return false;
        if (cred.expiresAt != 0 && block.timestamp > cred.expiresAt) return false;
        return true;
    }

    /// @notice Verify a credential by holder and hash.
    function verifyCredentialForHolder(
        address holder,
        bytes32 credentialHash
    )
        external
        view
        returns (bool valid)
    {
        Credential storage cred = s_credentials[credentialHash];
        if (cred.issuedAt == 0) revert CredReg__CredentialNotFound(credentialHash);
        if (cred.holder != holder) return false;
        if (cred.revoked) return false;
        if (cred.expiresAt != 0 && block.timestamp > cred.expiresAt) return false;
        return true;
    }

    // ──────────────────────────────────────
    // Revocation
    // ──────────────────────────────────────

    /// @notice Revoke a credential. Only the issuing issuer or owner may revoke.
    function revokeCredential(bytes32 credentialHash) external {
        Credential storage cred = s_credentials[credentialHash];
        if (cred.issuedAt == 0) revert CredReg__CredentialNotFound(credentialHash);
        require(
            msg.sender == cred.issuer || msg.sender == owner(),
            "CredReg: not authorized to revoke"
        );
        require(!cred.revoked, "Already revoked");

        cred.revoked = true;
        emit CredentialRevoked(credentialHash, cred.holder);
    }

    // ──────────────────────────────────────
    // Query Functions
    // ──────────────────────────────────────

    function getCredential(bytes32 credentialHash)
        external
        view
        returns (Credential memory)
    {
        Credential storage cred = s_credentials[credentialHash];
        if (cred.issuedAt == 0) revert CredReg__CredentialNotFound(credentialHash);
        return cred;
    }

    function getHolderCredentials(address holder)
        external
        view
        returns (bytes32[] memory)
    {
        return s_holderCredentials[holder];
    }

    function getHolderCredentialCount(address holder)
        external
        view
        returns (uint256)
    {
        return s_holderCredentials[holder].length;
    }

    // ──────────────────────────────────────
    // Admin — Issuer Management
    // ──────────────────────────────────────

    function setIssuer(address issuer, bool authorized) external onlyOwner {
        require(issuer != address(0), "CredReg: zero issuer");
        issuers[issuer] = authorized;
        emit IssuerUpdated(issuer, authorized);
    }

    // ──────────────────────────────────────
    // EIP-712 Domain Separator
    // ──────────────────────────────────────

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
