// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PredictionMarketAMM — AMM for Binary Outcome Prediction Markets
/// @notice Facilities stake tokens to forecast staffing needs.
///         Chainlink oracle resolves markets with ground-truth outcome.
/// @dev Uses a constant-product AMM (x * y = k) rebalanced by trades.
///      "Yes" and "No" shares are minted 1:1 with collateral deposit.
contract PredictionMarketAMM is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────
    // Custom Errors
    // ──────────────────────────────────────
    error MarketAMM__MarketClosed(uint256 marketId);
    error MarketAMM__MarketNotResolved(uint256 marketId);
    error MarketAMM__AlreadyResolved(uint256 marketId);
    error MarketAMM__InsufficientBalance();
    error MarketAMM__InsufficientLiquidity();
    error MarketAMM__InvalidAmount();
    error MarketAMM__MarketNotFound(uint256 marketId);
    error MarketAMM__OnlyOracle();
    error MarketAMM__TradingEnded(uint256 marketId);

    // ──────────────────────────────────────
    // Enums
    // ──────────────────────────────────────

    enum MarketStatus { Open, Trading, Closed, Resolved }

    // ──────────────────────────────────────
    // Structs
    // ──────────────────────────────────────

    struct Market {
        string question;
        uint256 closeTime;        // Unix timestamp when trading ends
        uint256 yesShares;        // Total YES shares in the pool
        uint256 noShares;         // Total NO shares in the pool
        uint256 totalLiquidity;   // Total collateral locked
        MarketStatus status;
        bool outcome;             // true = YES won, false = NO won
        uint256 resolvedAt;
        uint256 feeBasisPoints;   // Trading fee (e.g. 100 = 1%)
    }

    struct Position {
        uint256 yesShares;
        uint256 noShares;
        bool claimed;
    }

    // ──────────────────────────────────────
    // State
    // ──────────────────────────────────────

    IERC20 public immutable collateralToken;
    address public oracle;

    uint256 private s_nextMarketId;

    /// @notice Market ID → Market data
    mapping(uint256 => Market) private s_markets;

    /// @notice Market ID → User address → Position
    mapping(uint256 => mapping(address => Position)) private s_positions;

    /// @notice Fees collected (governance-controlled)
    uint256 public accumulatedFees;
    uint256 public constant MAX_FEE_BPS = 500; // 5% max fee

    /// @notice Minimum liquidity for market creation
    uint256 public minInitialLiquidity;

    // ──────────────────────────────────────
    // Events
    // ──────────────────────────────────────

    event MarketCreated(
        uint256 indexed marketId,
        string question,
        uint256 closeTime,
        uint256 initialLiquidity
    );

    event Trade(
        uint256 indexed marketId,
        address indexed trader,
        bool isYes,
        uint256 amount,
        uint256 sharesOut,
        uint256 yesPrice,
        uint256 noPrice
    );

    event MarketResolved(
        uint256 indexed marketId,
        bool outcome,
        uint256 resolvedAt
    );

    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );

    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event FeesWithdrawn(uint256 amount, address to);

    // ──────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────

    constructor(
        address _collateralToken,
        address _oracle,
        uint256 _minInitialLiquidity
    ) Ownable(msg.sender) {
        require(_collateralToken != address(0), "AMM: zero collateral");
        require(_oracle != address(0), "AMM: zero oracle");
        collateralToken = IERC20(_collateralToken);
        oracle = _oracle;
        minInitialLiquidity = _minInitialLiquidity;
    }

    // ──────────────────────────────────────
    // Modifiers
    // ──────────────────────────────────────

    modifier onlyOracle() {
        if (msg.sender != oracle) revert MarketAMM__OnlyOracle();
        _;
    }

    modifier marketExists(uint256 marketId) {
        if (marketId >= s_nextMarketId) revert MarketAMM__MarketNotFound(marketId);
        _;
    }

    // ──────────────────────────────────────
    // Market Creation
    // ──────────────────────────────────────

    /// @notice Create a new binary outcome prediction market.
    /// @param question  The question to be resolved (e.g. "Will ER need >3 nurses on shift 8/15?")
    /// @param closeTime  Unix timestamp when trading stops.
    /// @param feeBasisPoints  Fee in basis points (e.g. 100 = 1%).
    function createMarket(
        string calldata question,
        uint256 closeTime,
        uint256 feeBasisPoints
    )
        external
        nonReentrant
        returns (uint256 marketId)
    {
        require(bytes(question).length > 0, "AMM: empty question");
        require(closeTime > block.timestamp, "AMM: closeTime in past");
        require(feeBasisPoints <= MAX_FEE_BPS, "AMM: fee too high");

        marketId = s_nextMarketId;
        s_nextMarketId++;

        s_markets[marketId] = Market({
            question: question,
            closeTime: closeTime,
            yesShares: 0,
            noShares: 0,
            totalLiquidity: 0,
            status: MarketStatus.Open,
            outcome: false,
            resolvedAt: 0,
            feeBasisPoints: feeBasisPoints
        });

        emit MarketCreated(marketId, question, closeTime, minInitialLiquidity);
    }

    // ──────────────────────────────────────
    // Trading — buy YES or NO shares
    // ──────────────────────────────────────

    /// @notice Buy outcome shares from the AMM.
    /// @param marketId  The market to trade on.
    /// @param isYes  true → buy YES shares, false → buy NO shares.
    /// @param collateralAmount  Amount of collateralToken to spend.
    function buy(
        uint256 marketId,
        bool isYes,
        uint256 collateralAmount
    )
        external
        nonReentrant
        marketExists(marketId)
        returns (uint256 sharesOut)
    {
        Market storage market = s_markets[marketId];
        if (market.status == MarketStatus.Closed || market.status == MarketStatus.Resolved) {
            revert MarketAMM__MarketClosed(marketId);
        }
        if (block.timestamp >= market.closeTime) {
            revert MarketAMM__TradingEnded(marketId);
        }
        if (collateralAmount == 0) revert MarketAMM__InvalidAmount();

        // Transition from Open → Trading on first buy
        if (market.status == MarketStatus.Open) {
            market.status = MarketStatus.Trading;
        }

        uint256 fee = (collateralAmount * market.feeBasisPoints) / 10_000;
        uint256 netAmount = collateralAmount - fee;
        accumulatedFees += fee;

        // Calculate shares using constant-product AMM
        sharesOut = _calculateBuy(market, isYes, netAmount);

        // Update pool balances
        if (isYes) {
            market.yesShares += sharesOut;
        } else {
            market.noShares += sharesOut;
        }
        market.totalLiquidity += netAmount;

        // Update user position
        Position storage pos = s_positions[marketId][msg.sender];
        if (isYes) {
            pos.yesShares += sharesOut;
        } else {
            pos.noShares += sharesOut;
        }

        collateralToken.safeTransferFrom(msg.sender, address(this), collateralAmount);

        uint256 yesPrice = getYesPrice(marketId);
        uint256 noPrice = getNoPrice(marketId);

        emit Trade(marketId, msg.sender, isYes, collateralAmount, sharesOut, yesPrice, noPrice);
    }

    // ──────────────────────────────────────
    // Resolution — Oracle only
    // ──────────────────────────────────────

    /// @notice Resolve a market with the ground-truth outcome. CALLED BY ORACLE ONLY.
    /// @param marketId  Market to resolve.
    /// @param outcome  true = YES won, false = NO won.
    function resolve(uint256 marketId, bool outcome)
        external
        onlyOracle
        marketExists(marketId)
        nonReentrant
    {
        Market storage market = s_markets[marketId];
        if (market.status == MarketStatus.Resolved) revert MarketAMM__AlreadyResolved(marketId);

        market.status = MarketStatus.Closed;
        market.outcome = outcome;
        market.resolvedAt = block.timestamp;

        // After recording outcome, mark resolved
        market.status = MarketStatus.Resolved;

        emit MarketResolved(marketId, outcome, block.timestamp);
    }

    // ──────────────────────────────────────
    // Claim Winnings
    // ──────────────────────────────────────

    /// @notice Claim winnings after a market is resolved.
    /// @param marketId  The resolved market.
    function claimWinnings(uint256 marketId)
        external
        nonReentrant
        marketExists(marketId)
        returns (uint256 amount)
    {
        Market storage market = s_markets[marketId];
        if (market.status != MarketStatus.Resolved) {
            revert MarketAMM__MarketNotResolved(marketId);
        }

        Position storage pos = s_positions[marketId][msg.sender];
        if (pos.claimed) return 0;
        pos.claimed = true;

        uint256 winningShares = market.outcome ? pos.yesShares : pos.noShares;
        if (winningShares == 0) return 0;

        uint256 totalWinningPool = market.outcome ? market.yesShares : market.noShares;
        require(totalWinningPool > 0, "AMM: zero winning pool");

        // Payout = (user's winning shares / total winning shares) * total liquidity
        amount = (winningShares * market.totalLiquidity) / totalWinningPool;

        collateralToken.safeTransfer(msg.sender, amount);

        emit WinningsClaimed(marketId, msg.sender, amount);
    }

    // ──────────────────────────────────────
    // Price Oracles (on-chain)
    // ──────────────────────────────────────

    /// @notice Get the current YES share price (in collateral, WAD precision).
    function getYesPrice(uint256 marketId)
        public
        view
        marketExists(marketId)
        returns (uint256)
    {
        Market storage market = s_markets[marketId];
        if (market.yesShares == 0 && market.noShares == 0) return 0.5e18; // 0.5 WAD
        return (market.noShares * 1e18) / (market.yesShares + market.noShares);
    }

    /// @notice Get the current NO share price (in collateral, WAD precision).
    function getNoPrice(uint256 marketId)
        public
        view
        marketExists(marketId)
        returns (uint256)
    {
        uint256 yesPrice = getYesPrice(marketId);
        return 1e18 - yesPrice;
    }

    /// @notice Get the current odds ratio for a market.
    function getOdds(uint256 marketId)
        external
        view
        marketExists(marketId)
        returns (uint256 yesOdds, uint256 noOdds)
    {
        yesOdds = getYesPrice(marketId);
        noOdds = getNoPrice(marketId);
    }

    // ──────────────────────────────────────
    // Read Helpers
    // ──────────────────────────────────────

    function getMarket(uint256 marketId)
        external
        view
        marketExists(marketId)
        returns (Market memory)
    {
        return s_markets[marketId];
    }

    function getPosition(uint256 marketId, address user)
        external
        view
        marketExists(marketId)
        returns (Position memory)
    {
        return s_positions[marketId][user];
    }

    function getMarketCount() external view returns (uint256) {
        return s_nextMarketId;
    }

    // ──────────────────────────────────────
    // Admin
    // ──────────────────────────────────────

    function setOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "AMM: zero oracle");
        address old = oracle;
        oracle = _newOracle;
        emit OracleUpdated(old, _newOracle);
    }

    function withdrawFees(address to) external onlyOwner {
        require(to != address(0), "AMM: zero address");
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        collateralToken.safeTransfer(to, amount);
        emit FeesWithdrawn(amount, to);
    }

    // ──────────────────────────────────────
    // Internal — AMM Math
    // ──────────────────────────────────────

    /// @dev Constant-product calculation: given Δx (collateral in), compute Δy (shares out).
    ///      Uses x * y = k, where x is the non-target pool and y is the target pool.
    function _calculateBuy(
        Market storage market,
        bool isYes,
        uint256 netAmount
    )
        internal
        view
        returns (uint256)
    {
        uint256 poolA = isYes ? market.noShares : market.yesShares;
        uint256 poolB = isYes ? market.yesShares : market.noShares;

        // Initial bootstrap: first trader seeds the pool
        if (poolA == 0 || poolB == 0) {
            return netAmount; // 1:1 initial price
        }

        // k = poolA * poolB (constant before trade)
        // After adding Δx to poolA, poolB' = k / (poolA + Δx)
        // sharesOut = poolB - poolB'
        uint256 k = poolA * poolB;
        uint256 newPoolA = poolA + netAmount;
        uint256 newPoolB = k / newPoolA;
        return poolB - newPoolB;
    }
}
