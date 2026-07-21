import { NextResponse } from "next/server";
import { confirmDepositSession } from "../../../../agent/lib/deposits";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const checkoutSessionId = body?.checkoutSessionId;
  if (typeof checkoutSessionId !== "string" || !checkoutSessionId) {
    return NextResponse.json({ error: "checkoutSessionId is required." }, { status: 400 });
  }
  const result = await confirmDepositSession(checkoutSessionId);
  return NextResponse.json(result);
}
