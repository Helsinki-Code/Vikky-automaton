import { NextResponse } from "next/server";
import { getOrCreateWallet } from "../../../agent/lib/wallet";
import { getTempoUsdcBalance } from "../../../agent/lib/tempo-balance";
import { totalOnChainIncomeUsdc, recentOnChainIncome } from "../../../agent/lib/onchain-income";

export async function GET() {
  const wallet = await getOrCreateWallet();
  if (wallet.chainType !== "evm") {
    return NextResponse.json({ evm: false });
  }
  const balance = await getTempoUsdcBalance(wallet.address as `0x${string}`, "mainnet");
  return NextResponse.json({
    evm: true,
    address: wallet.address,
    network: "Tempo mainnet",
    usdcBalance: balance.balance,
    usdcBalanceOk: balance.ok,
    usdcBalanceError: balance.error,
    totalIncomeUsdc: await totalOnChainIncomeUsdc(),
    recentIncome: await recentOnChainIncome(5),
  });
}
