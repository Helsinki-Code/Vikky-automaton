/**
 * Checks the automaton's real USDC balance on Tempo — the network its mppx
 * payment helper (_automaton_mpp.js) actually settles on. Separate from
 * agent/lib/x402.ts's Base-network balance check, which is for the
 * unrelated x402_fetch spending path.
 */

import { createPublicClient, http, type Address } from "viem";
import { tempoMainnet, tempoTestnet } from "viem/chains";

const TEMPO_USDC = {
  mainnet: "0x20c000000000000000000000b9537d11c60e8b50",
  testnet: "0x20c0000000000000000000000000000000000000",
} as const;

const BALANCE_OF_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface TempoBalanceResult {
  balance: number;
  network: "mainnet" | "testnet";
  ok: boolean;
  error?: string;
}

export async function getTempoUsdcBalance(
  address: Address,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<TempoBalanceResult> {
  try {
    const chain = network === "mainnet" ? tempoMainnet : tempoTestnet;
    const client = createPublicClient({ chain, transport: http() });
    const balance = await client.readContract({
      address: TEMPO_USDC[network] as Address,
      abi: BALANCE_OF_ABI,
      functionName: "balanceOf",
      args: [address],
    });
    return { balance: Number(balance) / 1_000_000, network, ok: true };
  } catch (err) {
    return { balance: 0, network, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
