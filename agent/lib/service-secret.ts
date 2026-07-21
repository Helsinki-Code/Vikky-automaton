/**
 * A per-automaton shared secret so its own deployed services (see
 * deploy_service) can call back into /api/service-revenue/* to charge real
 * customers via Stripe and credit the same ledger everything else uses —
 * without that endpoint being callable by arbitrary internet traffic to spam
 * Stripe with junk checkout sessions.
 */

import { readJson, writeJson } from "./store";

const SECRET_FILE = "service-revenue-secret.json";

export async function getOrCreateServiceRevenueSecret(): Promise<string> {
  const existing = await readJson<{ secret: string } | null>(SECRET_FILE, null);
  if (existing) return existing.secret;
  const secret = crypto.randomUUID() + crypto.randomUUID();
  await writeJson(SECRET_FILE, { secret });
  return secret;
}
