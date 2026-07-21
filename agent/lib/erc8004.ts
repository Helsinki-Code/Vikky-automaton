/**
 * Minimal ERC-8004-style Identity Registry client.
 *
 * ERC-8004 defines an on-chain identity registry for autonomous agents:
 * register(agentURI) mints/records an identity tied to msg.sender and emits
 * AgentRegistered. This is a minimal ABI covering that core registration
 * path — swap in the exact deployed contract's ABI here if it differs.
 *
 * The signing key comes from this automaton's own auto-generated wallet
 * (agent/lib/wallet.ts), not an operator-supplied env var — the whole point
 * of a sovereign identity is that the automaton owns the key that speaks
 * for it.
 */

import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { base, baseSepolia } from "viem/chains";
import { getEvmAccount } from "./wallet";

const REGISTRY_ABI = parseAbi([
  "function registerAgent(string agentURI) returns (uint256 agentId)",
  "event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentURI)",
]);

export interface Erc8004Config {
  rpcUrl: string;
  contractAddress: `0x${string}`;
}

export function loadErc8004Config(): Erc8004Config | null {
  const rpcUrl = process.env.RPC_URL;
  const contractAddress = process.env.ERC8004_REGISTRY_ADDRESS as `0x${string}` | undefined;
  if (!rpcUrl || !contractAddress) return null;
  return { rpcUrl, contractAddress };
}

export async function registerAgentOnChain(
  config: Erc8004Config,
  agentURI: string,
): Promise<{ txHash: string; agentId?: string }> {
  const account = await getEvmAccount();
  const transport = http(config.rpcUrl);
  // Matches scripts/deploy-erc8004.mjs's chain selection: same RPC_URL
  // convention decides mainnet vs testnet on both the deploy side and here.
  const chain = config.rpcUrl.includes("sepolia") ? baseSepolia : base;
  const wallet = createWalletClient({ account, chain, transport });
  const publicClient = createPublicClient({ chain, transport });

  const txHash = await wallet.writeContract({
    address: config.contractAddress,
    abi: REGISTRY_ABI,
    functionName: "registerAgent",
    args: [agentURI],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const log = receipt.logs.find((l) => l.address.toLowerCase() === config.contractAddress.toLowerCase());
  return { txHash, agentId: log ? BigInt(log.topics[1] ?? "0x0").toString() : undefined };
}
