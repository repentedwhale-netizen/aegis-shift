// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ShiftNFT} from "../src/ShiftNFT.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ShiftNFTTest is Test {
    ShiftNFT public shiftNft;
    address public minter = address(0x1);
    address public staff = address(0x2);
    address public stranger = address(0x3);

    function setUp() public {
        shiftNft = new ShiftNFT(minter);
    }

    function test_MintShiftNFT() public {
        vm.prank(minter);
        uint256 tokenId = shiftNft.mintShiftNFT(
            staff,
            1,
            "ipfs://QmTest",
            "ICU Nurse",
            "Emergency"
        );

        assertEq(tokenId, 0);
        assertEq(shiftNft.ownerOf(tokenId), staff);
        assertEq(shiftNft.getShiftCount(staff), 1);
    }

    function test_MintShiftNFT_RevertIfNotAuthorized() public {
        vm.prank(stranger);
        vm.expectRevert("ShiftNFT: not authorized");
        shiftNft.mintShiftNFT(staff, 1, "ipfs://QmTest", "ICU Nurse", "Emergency");
    }

    function test_CompleteShift() public {
        vm.prank(minter);
        uint256 tokenId = shiftNft.mintShiftNFT(
            staff,
            1,
            "ipfs://QmTest",
            "ER Physician",
            "ER"
        );

        assertFalse(shiftNft.isShiftCompleted(tokenId));

        vm.prank(minter);
        shiftNft.completeShift(tokenId);

        assertTrue(shiftNft.isShiftCompleted(tokenId));
    }

    function test_CompleteShift_RevertIfAlreadyCompleted() public {
        vm.prank(minter);
        uint256 tokenId = shiftNft.mintShiftNFT(
            staff,
            1,
            "ipfs://QmTest",
            "ER Physician",
            "ER"
        );

        vm.startPrank(minter);
        shiftNft.completeShift(tokenId);

        vm.expectRevert(
            abi.encodeWithSelector(ShiftNFT.ShiftNFT__ShiftAlreadyCompleted.selector, tokenId)
        );
        shiftNft.completeShift(tokenId);
        vm.stopPrank();
    }

    function test_Transfer_RevertSoulbound() public {
        vm.prank(minter);
        uint256 tokenId = shiftNft.mintShiftNFT(
            staff,
            1,
            "ipfs://QmTest",
            "ICU Nurse",
            "Emergency"
        );

        vm.prank(staff);
        vm.expectRevert(ShiftNFT.ShiftNFT__TokenSoulbound.selector);
        shiftNft.transferFrom(staff, stranger, tokenId);
    }

    function test_Approve_RevertSoulbound() public {
        vm.prank(minter);
        shiftNft.mintShiftNFT(staff, 1, "ipfs://QmTest", "ICU Nurse", "Emergency");

        vm.prank(staff);
        vm.expectRevert(ShiftNFT.ShiftNFT__TokenSoulbound.selector);
        shiftNft.approve(stranger, 0);
    }

    function test_GetShiftHistory() public {
        vm.startPrank(minter);
        shiftNft.mintShiftNFT(staff, 1, "ipfs://QmA", "ICU Nurse", "ER");
        shiftNft.mintShiftNFT(staff, 2, "ipfs://QmB", "ER Physician", "ER");
        shiftNft.mintShiftNFT(staff, 3, "ipfs://QmC", "Surgeon", "Surgery");
        vm.stopPrank();

        uint256[] memory history = shiftNft.getShiftHistory(staff);
        assertEq(history.length, 3);
        assertEq(shiftNft.getShiftCount(staff), 3);
    }

    function test_GetShift() public {
        vm.prank(minter);
        uint256 tokenId = shiftNft.mintShiftNFT(
            staff,
            42,
            "ipfs://QmShift",
            "ICU Nurse",
            "ICU"
        );

        ShiftNFT.Shift memory shift = shiftNft.getShift(tokenId);
        assertEq(shift.shiftId, 42);
        assertEq(shift.staff, staff);
        assertEq(shift.role, "ICU Nurse");
        assertEq(shift.department, "ICU");
        assertFalse(shift.isCompleted);
    }

    function test_SetMinter() public {
        shiftNft.setMinter(stranger);
        vm.prank(stranger);
        uint256 tokenId = shiftNft.mintShiftNFT(
            staff,
            1,
            "ipfs://QmTest",
            "Nurse",
            "General"
        );
        assertEq(shiftNft.ownerOf(tokenId), staff);
    }
}
