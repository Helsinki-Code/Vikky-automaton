import { NextResponse } from "next/server";
import { getOrCreateServiceRevenueSecret } from "../../../../agent/lib/service-secret";
import { createDepositSession } from "../../../../agent/lib/deposits";

/**
 * Called by services this automaton deploys (deploy_service), never by the
 * public internet directly — gated on a shared secret so arbitrary callers
 * can't spam Stripe with junk checkout sessions under this account.
 */
export async function POST(request: Request) {
  const secret = await getOrCreateServiceRevenueSecret();
  if (request.headers.get("x-automaton-service-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const amountCents = Math.round(Number(body?.amountCents));
  const serviceName = typeof body?.serviceName === "string" ? body.serviceName : "Deployed service";
  const successUrl = typeof body?.successUrl === "string" ? body.successUrl : undefined;
  const cancelUrl = typeof body?.cancelUrl === "string" ? body.cancelUrl : undefined;

  if (!Number.isFinite(amountCents) || amountCents < 50 || !successUrl || !cancelUrl) {
    return NextResponse.json(
      { error: "amountCents (min 50), successUrl, and cancelUrl are required." },
      { status: 400 },
    );
  }

  const { paymentUrl, checkoutSessionId } = await createDepositSession(
    amountCents,
    { successUrl, cancelUrl },
    serviceName,
  );

  return NextResponse.json({ checkoutUrl: paymentUrl, sessionId: checkoutSessionId });
}
