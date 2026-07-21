import { NextResponse } from "next/server";
import { getOrCreateWallet } from "../../../agent/lib/wallet";
import { getUsdcBalanceDetailed } from "../../../agent/lib/x402";
import { totalOnChainIncomeUsdc, recentOnChainIncome } from "../../../agent/lib/onchain-income";

export async function GET() {
  const wallet = await getOrCreateWallet();
  if (wallet.chainType !== "evm") {
    return NextResponse.json({ evm: false });
  }
  const balance = await getUsdcBalanceDetailed(wallet.address as `0x${string}`, "eip155:8453");
  return NextResponse.json({
    evm: true,
    address: wallet.address,
    usdcBalance: balance.balance,
    usdcBalanceOk: balance.ok,
    usdcBalanceError: balance.error,
    totalIncomeUsdc: await totalOnChainIncomeUsdc(),
    recentIncome: await recentOnChainIncome(5),
  });
}
