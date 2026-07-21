import { NextResponse } from "next/server";
import { executeWithdrawal } from "../../../agent/lib/withdrawals";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const amountCents = Number(body?.amountCents);
  const reason = String(body?.reason || "");
  const confirmed = body?.confirmed === true;

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "amountCents must be a positive integer." }, { status: 400 });
  }
  if (reason.length < 5) {
    return NextResponse.json({ error: "reason must be at least 5 characters." }, { status: 400 });
  }
  // Real-money, irreversible action: require an explicit second confirmation
  // from the dashboard UI, same spirit as the chat tool's always() approval.
  if (!confirmed) {
    return NextResponse.json({ error: "Withdrawal not confirmed.", requiresConfirmation: true }, { status: 428 });
  }

  const result = await executeWithdrawal(amountCents, reason);
  return NextResponse.json(result);
}
