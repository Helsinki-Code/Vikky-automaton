import { NextResponse } from "next/server";
import { getOrCreateWallet, getEvmAccount } from "../../../../agent/lib/wallet";
import { getOrCreateX402SettleSecret } from "../../../../agent/lib/x402-secret";
import { verifyAndSettlePayment } from "../../../../agent/lib/x402-server";
import { recordOnChainIncome } from "../../../../agent/lib/onchain-income";

/**
 * Called by services this automaton deploys (deploy_service), never by the
 * public internet — gated on a shared secret injected into the deployed
 * service's own env, so arbitrary callers can't burn this automaton's ETH
 * gas with junk settlement attempts. Settlement only ever moves USDC INTO
 * this automaton's own wallet (enforced in verifyAndSettlePayment), so even
 * a leaked secret can't redirect funds elsewhere.
 */
export async function POST(request: Request) {
  const secret = await getOrCreateX402SettleSecret();
  if (request.headers.get("x-automaton-settle-secret") !== secret) {
    return NextResponse.json({ settled: false, reason: "Unauthorized." }, { status: 401 });
  }

  const wallet = await getOrCreateWallet();
  if (wallet.chainType !== "evm") {
    return NextResponse.json({ settled: false, reason: "This automaton's wallet is not EVM." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const payment = body?.payment as string | undefined;
  const minAmountUsdc = Number(body?.minAmountUsdc ?? 0);
  const description = typeof body?.description === "string" ? body.description : "x402 service payment";
  if (!payment || !Number.isFinite(minAmountUsdc) || minAmountUsdc <= 0) {
    return NextResponse.json({ settled: false, reason: "Missing payment or minAmountUsdc." }, { status: 400 });
  }

  const account = await getEvmAccount();
  const minAmountAtomic = BigInt(Math.round(minAmountUsdc * 1_000_000));
  const result = await verifyAndSettlePayment(payment, account, wallet.address, minAmountAtomic);

  if (result.settled && result.txHash) {
    await recordOnChainIncome(result.amountUsdc ?? minAmountUsdc, description, result.txHash);
  }

  return NextResponse.json(result, { status: result.settled ? 200 : 402 });
}
