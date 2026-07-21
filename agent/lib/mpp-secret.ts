/**
 * Per-automaton secret for mppx (Machine Payments Protocol) challenge
 * signing — passed as `Mppx.create({ secretKey })`. This is a protocol
 * integrity secret (HMAC-signs payment challenges so they can't be forged),
 * not a payment-processor credential like a Stripe key: nothing more than a
 * random string is needed, and mppx's own docs suggest `openssl rand -base64
 * 32`. Generated once and reused across every deployed service so a single
 * automaton has one consistent identity across all of them.
 */

import { readJson, writeJson } from "./store";

const SECRET_FILE = "mpp-secret.json";

export async function getOrCreateMppSecretKey(): Promise<string> {
  const existing = await readJson<{ secret: string } | null>(SECRET_FILE, null);
  if (existing) return existing.secret;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const secret = Buffer.from(bytes).toString("base64");
  await writeJson(SECRET_FILE, { secret });
  return secret;
}
