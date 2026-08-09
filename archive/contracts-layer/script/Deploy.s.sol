// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ShiftNFT} from "../src/ShiftNFT.sol";
import {PredictionMarketAMM} from "../src/PredictionMarketAMM.sol";
import {CredentialRegistry} from "../src/CredentialRegistry.sol";
import {DisputeArbitrator} from "../src/DisputeArbitrator.sol";

/// @title Deploy — Full Aegis Shift contract suite deployer
/// @notice Deploys all 4 core contracts with correct constructor arguments.
///         Set env vars before running:
///           DEPLOYER_ADDRESS — address that will own all contracts
///           AI_AGENT_ADDRESS — the AI agent authorized to call DisputeArbitrator + minter
///           MULTISIG_ADDRESS  — Safe multi-sig for human appeal
///           COLLATERAL_TOKEN  — ERC20 token for prediction market collateral
///           INITIAL_ISSUERS   — Comma-separated addresses for CredentialRegistry issuers
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        address aiAgent = vm.envAddress("AI_AGENT_ADDRESS");
        address multiSig = vm.envAddress("MULTISIG_ADDRESS");
        address collateralToken = vm.envAddress("COLLATERAL_TOKEN");

        vm.startBroadcast(deployerKey);

        // 1. ShiftNFT (soulbound NFT for shifts)
        ShiftNFT shiftNft = new ShiftNFT(aiAgent);
        console.log("ShiftNFT deployed at:", address(shiftNft));

        // 2. PredictionMarketAMM
        PredictionMarketAMM predictionMarket = new PredictionMarketAMM(
            collateralToken,
            aiAgent, // oracle = AI agent
            1000e18  // min initial liquidity
        );
        console.log("PredictionMarketAMM deployed at:", address(predictionMarket));

        // 3. CredentialRegistry
        address[] memory issuers = new address[](1);
        issuers[0] = deployer; // deployer is initial issuer
        CredentialRegistry credentialRegistry = new CredentialRegistry(issuers);
        console.log("CredentialRegistry deployed at:", address(credentialRegistry));

        // 4. DisputeArbitrator
        DisputeArbitrator disputeArbitrator = new DisputeArbitrator(
            aiAgent,
            multiSig,
            1 days,  // timelock
            3 days   // max resolution time
        );
        console.log("DisputeArbitrator deployed at:", address(disputeArbitrator));

        vm.stopBroadcast();

        console.log("---");
        console.log("All 4 Aegis Shift contracts deployed successfully.");
    }
}
