import { defineTool } from "eve/tools";
import { z } from "zod";
import { getUsdcBalanceDetailed } from "../lib/x402";
import { getTempoUsdcBalance } from "../lib/tempo-balance";
import { getOrCreateWallet } from "../lib/wallet";
import { recentOnChainIncome, totalOnChainIncomeUsdc } from "../lib/onchain-income";

export default defineTool({
  description:
    "Check this automaton's on-chain USDC balances (separate from the Stripe-backed ledger): Base (spent from by x402_fetch) and Tempo (settled into by _automaton_mpp.js's real machine payments). Also reports on-chain income history.",
  inputSchema: z.object({
    network: z.enum(["base", "base-sepolia", "tempo", "tempo-testnet"]).default("tempo"),
  }),
  async execute({ network }) {
    const wallet = await getOrCreateWallet();
    if (wallet.chainType === "solana") {
      return { checked: false, reason: "This automaton's wallet is Solana, not EVM — no USDC balance to report." };
    }

    if (network === "tempo" || network === "tempo-testnet") {
      const result = await getTempoUsdcBalance(
        wallet.address as `0x${string}`,
        network === "tempo-testnet" ? "testnet" : "mainnet",
      );
      return {
        checked: result.ok,
        address: wallet.address,
        network,
        usdcBalance: result.balance,
        reason: result.ok ? undefined : result.error,
        totalOnChainIncomeUsdc: await totalOnChainIncomeUsdc(),
        recentOnChainIncome: await recentOnChainIncome(5),
      };
    }

    const networkId = network === "base-sepolia" ? "eip155:84532" : "eip155:8453";
    const result = await getUsdcBalanceDetailed(wallet.address as `0x${string}`, networkId);
    return {
      checked: result.ok,
      address: wallet.address,
      network,
      usdcBalance: result.balance,
      reason: result.ok ? undefined : result.error,
      totalOnChainIncomeUsdc: await totalOnChainIncomeUsdc(),
      recentOnChainIncome: await recentOnChainIncome(5),
    };
  },
});
