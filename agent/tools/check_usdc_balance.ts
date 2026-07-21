import { defineTool } from "eve/tools";
import { z } from "zod";
import { getUsdcBalanceDetailed } from "../lib/x402";
import { getOrCreateWallet } from "../lib/wallet";

export default defineTool({
  description:
    "Check this automaton's on-chain USDC balance on Base (separate from the Stripe-backed ledger). This is the balance x402_fetch spends from when paying for x402-metered APIs.",
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
    };
  },
});
