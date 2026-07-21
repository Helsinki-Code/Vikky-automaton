import { NextResponse } from "next/server";
import { getOrCreateServiceRevenueSecret } from "../../../../agent/lib/service-secret";
import { confirmDepositSession } from "../../../../agent/lib/deposits";
import { recordServiceRevenue } from "../../../../agent/lib/service-revenue";

export async function POST(request: Request) {
  const secret = await getOrCreateServiceRevenueSecret();
  if (request.headers.get("x-automaton-service-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;
  const serviceId = typeof body?.serviceId === "string" ? body.serviceId : undefined;
  const serviceName = typeof body?.serviceName === "string" ? body.serviceName : "deployed service";
  if (!sessionId) {
    return NextResponse.json({ credited: false, reason: "sessionId is required." }, { status: 400 });
  }

  const result = await confirmDepositSession(sessionId, `Service revenue (${serviceName}): Stripe session ${sessionId}`);
  if (result.credited && serviceId) {
    await recordServiceRevenue(serviceId, serviceName, result.amountCents, sessionId);
  }
  return NextResponse.json(result, { status: result.credited ? 200 : 402 });
}
