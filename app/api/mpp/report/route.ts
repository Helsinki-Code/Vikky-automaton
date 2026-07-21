import { NextResponse } from "next/server";
import { getOrCreateMppSecretKey } from "../../../../agent/lib/mpp-secret";
import { recordOnChainIncome } from "../../../../agent/lib/onchain-income";

/**
 * Purely for dashboard visibility — the mppx payment itself already settled
 * peer-to-peer on the Tempo network by the time a deployed service calls
 * this. Nothing here can create or move money; it only lets a real receipt
 * show up in check_usdc_balance / the Settings page. Gated on the same
 * per-automaton secret as the other service callbacks.
 */
export async function POST(request: Request) {
  const secret = await getOrCreateMppSecretKey();
  if (request.headers.get("x-automaton-mpp-secret") !== secret) {
    return NextResponse.json({ recorded: false, reason: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  const description = typeof body?.description === "string" ? body.description : "mppx (Tempo) payment received";
  const externalId = typeof body?.externalId === "string" ? body.externalId : `mpp-${Date.now()}`;
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ recorded: false, reason: "amount must be a positive number." }, { status: 400 });
  }

  const entry = await recordOnChainIncome(amount, description, externalId);
  return NextResponse.json({ recorded: true, entry });
}
