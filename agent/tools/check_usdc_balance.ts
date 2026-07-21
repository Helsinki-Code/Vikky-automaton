import { defineTool } from "eve/tools";
import { z } from "zod";
import { getUsdcBalanceDetailed } from "../lib/x402";
import { getOrCreateWallet } from "../lib/wallet";
import { recentOnChainIncome, totalOnChainIncomeUsdc } from "../lib/onchain-income";

export default defineTool({
  description:
    "Check this automaton's on-chain USDC balance on Base (separate from the Stripe-backed ledger) and its history of x402 income received from deployed services. x402_fetch spends from this balance; deployed services (deploy_service) settling incoming payments add to it.",
  inputSchema: z.object({
    network: z.enum(["base", "base-sepolia"]).default("base"),
  }),
  async execute({ network }) {
    const wallet = await getOrCreateWallet();
    if (wallet.chainType === "solana") {
      return { checked: false, reason: "This automaton's wallet is Solana, not EVM — no USDC-on-Base balance to report." };
    }
    const networkId = network === "base-sepolia" ? "eip155:84532" : "eip155:8453";
    const result = await getUsdcBalanceDetailed(wallet.address as `0x${string}`, networkId);
    return {
      checked: result.ok,
      address: wallet.address,
      network,
      usdcBalance: result.balance,
      reason: result.ok ? undefined : result.error,
      totalX402IncomeUsdc: await totalOnChainIncomeUsdc(),
      recentX402Income: await recentOnChainIncome(5),
    };
  },
});
