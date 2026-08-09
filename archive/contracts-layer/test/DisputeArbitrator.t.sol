// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {DisputeArbitrator} from "../src/DisputeArbitrator.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract DisputeArbitratorTest is Test {
    DisputeArbitrator public arbitrator;
    MockERC20 public token;
    address public aiAgent = address(0x1);
    address public multiSig = address(0x2);
    address public facility = address(0x3);
    address public staff = address(0x4);

    uint256 constant TIMELOCK = 1 days;
    uint256 constant MAX_RESOLUTION = 3 days;

    function setUp() public {
        token = new MockERC20("USDC", "USDC", 6);
        arbitrator = new DisputeArbitrator(aiAgent, multiSig, TIMELOCK, MAX_RESOLUTION);

        token.mint(facility, 100_000e6);
        vm.prank(facility);
        token.approve(address(arbitrator), type(uint256).max);
    }

    function test_FileDispute() public {
        vm.prank(facility);
        uint256 disputeId = arbitrator.fileDispute(
            42,
            staff,
            token,
            1000e6,
            "Staff no-show for ER shift"
        );

        assertEq(disputeId, 0);
        assertEq(arbitrator.getDisputeCount(), 1);

        DisputeArbitrator.Dispute memory d = arbitrator.getDispute(0);
        assertEq(d.shiftId, 42);
        assertEq(d.facility, facility);
        assertEq(d.staff, staff);
        assertEq(d.escrowAmount, 1000e6);
    }

    function test_AIProposeResolution() public {
        vm.prank(facility);
        arbitrator.fileDispute(42, staff, token, 1000e6, "No-show");

        vm.prank(aiAgent);
        arbitrator.proposeResolution(
            0,
            500e6, // facility gets 500
            500e6, // staff gets 500
            DisputeArbitrator.ResolutionType.SplitFiftyFifty,
            "ipfs://QmEvidence"
        );

        DisputeArbitrator.Dispute memory d = arbitrator.getDispute(0);
        assertEq(uint256(d.status), uint256(DisputeArbitrator.DisputeStatus.AIResolved));
        assertEq(d.facilityPayout, 500e6);
        assertEq(d.staffPayout, 500e6);
    }

    function test_ExecuteResolution_AfterTimelock() public {
        vm.prank(facility);
        arbitrator.fileDispute(42, staff, token, 1000e6, "No-show");

        vm.prank(aiAgent);
        arbitrator.proposeResolution(0, 700e6, 300e6, DisputeArbitrator.ResolutionType.PayFacility, "ipfs://QmEvidence");

        vm.warp(block.timestamp + TIMELOCK + 1);

        uint256 facilityBalBefore = token.balanceOf(facility);
        uint256 staffBalBefore = token.balanceOf(staff);

        arbitrator.executeResolution(0);

        assertEq(token.balanceOf(facility), facilityBalBefore + 700e6);
        assertEq(token.balanceOf(staff), staffBalBefore + 300e6);
    }

    function test_ExecuteResolution_RevertBeforeTimelock() public {
        vm.prank(facility);
        arbitrator.fileDispute(42, staff, token, 1000e6, "No-show");

        vm.prank(aiAgent);
        arbitrator.proposeResolution(0, 700e6, 300e6, DisputeArbitrator.ResolutionType.PayFacility, "ipfs://QmEvidence");

        vm.expectRevert(
            abi.encodeWithSelector(
                DisputeArbitrator.Dispute__TimelockNotExpired.selector,
                0,
                block.timestamp + TIMELOCK
            )
        );
        arbitrator.executeResolution(0);
    }

    function test_MultiSigOverride() public {
        vm.prank(facility);
        arbitrator.fileDispute(42, staff, token, 1000e6, "No-show");

        vm.prank(multiSig);
        arbitrator.overrideResolution(0, 1000e6, 0, "DAO decision: full refund");

        DisputeArbitrator.Dispute memory d = arbitrator.getDispute(0);
        assertEq(uint256(d.status), uint256(DisputeArbitrator.DisputeStatus.Overridden));
        assertEq(token.balanceOf(facility), 100_000e6); // got full refund
    }

    function test_CancelDispute() public {
        vm.prank(facility);
        arbitrator.fileDispute(42, staff, token, 1000e6, "No-show");

        uint256 balBefore = token.balanceOf(facility);

        vm.prank(facility);
        arbitrator.cancelDispute(0);

        assertEq(token.balanceOf(facility), balBefore + 1000e6);
    }

    function test_ProposeResolution_RevertInvalidPayout() public {
        vm.prank(facility);
        arbitrator.fileDispute(42, staff, token, 1000e6, "No-show");

        vm.prank(aiAgent);
        vm.expectRevert(DisputeArbitrator.Dispute__InvalidResolution.selector);
        arbitrator.proposeResolution(
            0,
            400e6, // 400 + 400 = 800 ≠ 1000
            400e6,
            DisputeArbitrator.ResolutionType.SplitFiftyFifty,
            "ipfs://QmBad"
        );
    }

    function test_FileDispute_RevertZeroAmount() public {
        vm.prank(facility);
        vm.expectRevert(DisputeArbitrator.Dispute__ZeroAmount.selector);
        arbitrator.fileDispute(42, staff, token, 0, "No-show");
    }
}
