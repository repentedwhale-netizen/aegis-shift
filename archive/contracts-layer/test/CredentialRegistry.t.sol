// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {CredentialRegistry} from "../src/CredentialRegistry.sol";

contract CredentialRegistryTest is Test {
    CredentialRegistry public registry;
    address public issuer = address(0x1);
    address public holder = address(0x2);
    address public verifier = address(0x3);

    function setUp() public {
        address[] memory issuers = new address[](1);
        issuers[0] = issuer;
        registry = new CredentialRegistry(issuers);
    }

    function test_IssueCredentialDirect() public {
        bytes32 credHash = keccak256("NURSING_LICENSE_123");

        vm.prank(issuer);
        registry.issueCredentialDirect(
            holder,
            credHash,
            0, // never expires
            "ipfs://QmCredential"
        );

        bool valid = registry.verifyCredential(credHash);
        assertTrue(valid);
    }

    function test_VerifyExpiredCredential() public {
        bytes32 credHash = keccak256("EXPIRED_LICENSE");

        uint256 expiresAt = block.timestamp + 100;
        vm.prank(issuer);
        registry.issueCredentialDirect(holder, credHash, expiresAt, "ipfs://QmExpired");

        vm.warp(block.timestamp + 101);

        bool valid = registry.verifyCredential(credHash);
        assertFalse(valid);
    }

    function test_RevokeCredential() public {
        bytes32 credHash = keccak256("REVOKED_LICENSE");

        vm.prank(issuer);
        registry.issueCredentialDirect(holder, credHash, 0, "ipfs://QmRevoked");

        vm.prank(issuer);
        registry.revokeCredential(credHash);

        bool valid = registry.verifyCredential(credHash);
        assertFalse(valid);
    }

    function test_RevokeCredential_RevertUnauthorized() public {
        bytes32 credHash = keccak256("LICENSE_456");

        vm.prank(issuer);
        registry.issueCredentialDirect(holder, credHash, 0, "ipfs://QmTest");

        vm.prank(verifier);
        vm.expectRevert("CredReg: not authorized to revoke");
        registry.revokeCredential(credHash);
    }

    function test_IssueCredential_RevertNotIssuer() public {
        bytes32 credHash = keccak256("FAKE_LICENSE");

        vm.prank(holder);
        vm.expectRevert(CredentialRegistry.CredReg__NotIssuer.selector);
        registry.issueCredentialDirect(holder, credHash, 0, "ipfs://QmFake");
    }

    function test_VerifyCredentialForHolder() public {
        bytes32 credHash = keccak256("LICENSE_789");

        vm.prank(issuer);
        registry.issueCredentialDirect(holder, credHash, 0, "ipfs://QmCred");

        assertTrue(registry.verifyCredentialForHolder(holder, credHash));
        assertFalse(registry.verifyCredentialForHolder(address(0xdead), credHash));
    }

    function test_GetHolderCredentials() public {
        vm.startPrank(issuer);
        bytes32 h1 = keccak256("LICENSE_A");
        bytes32 h2 = keccak256("LICENSE_B");
        registry.issueCredentialDirect(holder, h1, 0, "ipfs://A");
        registry.issueCredentialDirect(holder, h2, 0, "ipfs://B");
        vm.stopPrank();

        bytes32[] memory creds = registry.getHolderCredentials(holder);
        assertEq(creds.length, 2);
        assertEq(registry.getHolderCredentialCount(holder), 2);
    }

    function test_SetIssuer() public {
        registry.setIssuer(verifier, true);
        assertTrue(true); // no revert = pass
    }
}
