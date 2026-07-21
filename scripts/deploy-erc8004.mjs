#!/usr/bin/env node
/**
 * Deploys the compiled ERC8004Registry to whatever RPC_URL points at, from
 * DEPLOYER_PRIVATE_KEY (the CREATOR's own funded wallet, not the automaton's
 * — this is a one-time human setup step, not an agent action). Run
 * scripts/compile-erc8004.mjs first.
 *
 *   RPC_URL=https://sepolia.base.org \
 *   DEPLOYER_PRIVATE_KEY=0x... \
 *   node scripts/deploy-erc8004.mjs
 *
 * Prints the deployed contract address — put that in ERC8004_REGISTRY_ADDRESS
 * in .env.local, alongside the same RPC_URL. Never commit DEPLOYER_PRIVATE_KEY
 * anywhere; it's only read from the environment for this one-shot script.
 */
import fs from "node:fs";
import path from "node:path";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

const ARTIFACT_PATH = path.join(process.cwd(), "contracts", "ERC8004Registry.json");

const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!rpcUrl || !privateKey) {
  console.error("Set RPC_URL and DEPLOYER_PRIVATE_KEY env vars before running this script.");
  process.exit(1);
}
if (!fs.existsSync(ARTIFACT_PATH)) {
  console.error(`${ARTIFACT_PATH} not found — run: node scripts/compile-erc8004.mjs`);
  process.exit(1);
}

const { abi, bytecode } = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf-8"));
const account = privateKeyToAccount(privateKey);
const chain = rpcUrl.includes("sepolia") ? baseSepolia : base;
const transport = http(rpcUrl);

console.log(`Deploying ERC8004Registry to ${chain.name} as ${account.address}...`);

const walletClient = createWalletClient({ account, chain, transport });
const publicClient = createPublicClient({ chain, transport });

const txHash = await walletClient.deployContract({ abi, bytecode });
console.log(`Deploy tx: ${txHash}`);
console.log("Waiting for confirmation...");

const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
if (!receipt.contractAddress) {
  console.error("Deployment failed — no contract address in receipt.");
  process.exit(1);
}

console.log("");
console.log("Deployed successfully.");
console.log(`Contract address: ${receipt.contractAddress}`);
console.log("");
console.log("Add these to .env.local:");
console.log(`  RPC_URL=${rpcUrl}`);
console.log(`  ERC8004_REGISTRY_ADDRESS=${receipt.contractAddress}`);
