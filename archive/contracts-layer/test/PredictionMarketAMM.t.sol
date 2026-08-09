// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PredictionMarketAMM} from "../src/PredictionMarketAMM.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract PredictionMarketAMMTest is Test {
    PredictionMarketAMM public market;
    MockERC20 public collateral;
    address public oracle = address(0x1);
    address public trader1 = address(0x2);
    address public trader2 = address(0x3);

    uint256 constant INITIAL_LIQUIDITY = 1000e18;

    function setUp() public {
        collateral = new MockERC20("USDC", "USDC", 6);
        market = new PredictionMarketAMM(address(collateral), oracle, INITIAL_LIQUIDITY);

        // Fund traders
        collateral.mint(trader1, 100_000e6);
        collateral.mint(trader2, 100_000e6);

        vm.prank(trader1);
        collateral.approve(address(market), type(uint256).max);
        vm.prank(trader2);
        collateral.approve(address(market), type(uint256).max);
    }

    function test_CreateMarket() public {
        uint256 closeTime = block.timestamp + 7 days;
        uint256 marketId = market.createMarket(
            "Will ER need >3 nurses on shift 8/15?",
            closeTime,
            100 // 1% fee
        );

        assertEq(marketId, 0);
        assertEq(market.getMarketCount(), 1);

        PredictionMarketAMM.Market memory m = market.getMarket(marketId);
        assertEq(m.question, "Will ER need >3 nurses on shift 8/15?");
        assertEq(m.closeTime, closeTime);
    }

    function test_BuyYesShares() public {
        uint256 closeTime = block.timestamp + 7 days;
        market.createMarket("Question?", closeTime, 100);

        vm.prank(trader1);
        uint256 shares = market.buy(0, true, 1000e6);

        assertGt(shares, 0);
        PredictionMarketAMM.Position memory pos = market.getPosition(0, trader1);
        assertEq(pos.yesShares, shares);
    }

    function test_BuyNoShares() public {
        uint256 closeTime = block.timestamp + 7 days;
        market.createMarket("Question?", closeTime, 100);

        vm.prank(trader1);
        uint256 shares = market.buy(0, false, 1000e6);

        assertGt(shares, 0);
        PredictionMarketAMM.Position memory pos = market.getPosition(0, trader1);
        assertEq(pos.noShares, shares);
    }

    function test_ResolveMarket_Yes() public {
        uint256 closeTime = block.timestamp + 7 days;
        market.createMarket("Question?", closeTime, 100);

        vm.prank(trader1);
        market.buy(0, true, 5000e6);
        vm.prank(trader2);
        market.buy(0, false, 2000e6);

        // Fast-forward past close
        vm.warp(closeTime + 1);

        vm.prank(oracle);
        market.resolve(0, true); // YES wins

        PredictionMarketAMM.Market memory m = market.getMarket(0);
        assertTrue(m.outcome);

        // Trader1 (YES holder) should claim winnings
        vm.prank(trader1);
        uint256 winnings = market.claimWinnings(0);
        assertGt(winnings, 0);
    }

    function test_ClaimWinnings_RevertIfNotResolved() public {
        uint256 closeTime = block.timestamp + 7 days;
        market.createMarket("Question?", closeTime, 100);

        vm.prank(trader1);
        market.buy(0, true, 1000e6);

        vm.expectRevert(
            abi.encodeWithSelector(
                PredictionMarketAMM.MarketAMM__MarketNotResolved.selector,
                0
            )
        );
        market.claimWinnings(0);
    }

    function test_GetOdds_Initial() public {
        uint256 closeTime = block.timestamp + 7 days;
        market.createMarket("Question?", closeTime, 100);

        (uint256 yesOdds, uint256 noOdds) = market.getOdds(0);
        assertApproxEqAbs(yesOdds, 0.5e18, 1);
        assertApproxEqAbs(noOdds, 0.5e18, 1);
    }

    function test_RevertIfTradingEnded() public {
        uint256 closeTime = block.timestamp + 100;
        market.createMarket("Question?", closeTime, 100);

        vm.warp(closeTime + 1);

        vm.prank(trader1);
        vm.expectRevert(
            abi.encodeWithSelector(
                PredictionMarketAMM.MarketAMM__TradingEnded.selector,
                0
            )
        );
        market.buy(0, true, 1000e6);
    }
}
