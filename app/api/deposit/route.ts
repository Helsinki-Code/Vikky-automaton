import { NextResponse } from "next/server";
import { createDepositSession } from "../../../agent/lib/deposits";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const amountCents = Number(body?.amountCents);
  if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > 100_000) {
    return NextResponse.json({ error: "amountCents must be an integer between 100 and 100000." }, { status: 400 });
  }

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  try {
    // Stripe substitutes the literal {CHECKOUT_SESSION_ID} placeholder itself
    // on redirect — it must not be URL-encoded here.
    const { paymentUrl, checkoutSessionId } = await createDepositSession(amountCents, {
      successUrl: `${origin}/ledger?deposit=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/ledger?deposit=cancelled`,
    });
    return NextResponse.json({ paymentUrl, checkoutSessionId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Stripe request failed." }, { status: 502 });
  }
}
