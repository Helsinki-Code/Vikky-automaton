/**
 * A per-automaton shared secret so its own deployed services (see
 * deploy_service) can call back into /api/x402/settle to actually collect an
 * x402 payment, without that endpoint being callable by arbitrary internet
 * traffic to burn the automaton's ETH gas on bogus settlement attempts.
 */

import { readJson, writeJson } from "./store";

const SECRET_FILE = "x402-settle-secret.json";

export async function getOrCreateX402SettleSecret(): Promise<string> {
  const existing = await readJson<{ secret: string } | null>(SECRET_FILE, null);
  if (existing) return existing.secret;
  const secret = crypto.randomUUID() + crypto.randomUUID();
  await writeJson(SECRET_FILE, { secret });
  return secret;
}
