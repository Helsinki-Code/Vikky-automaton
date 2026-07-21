/**
 * Dashboard session cookie — signed, httpOnly, reuses the same
 * ROUTE_AUTH_USERNAME/ROUTE_AUTH_PASSWORD credential as the eve HTTP
 * channel's httpBasic() auth (agent/channels/eve.ts), so there's one
 * credential to remember, not two auth systems with separate secrets.
 *
 * Uses Web Crypto (not node:crypto) so this file works unmodified whether
 * Next.js runs middleware on the Edge runtime or the Node.js runtime.
 */

const COOKIE_NAME = "automaton_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretString(): string {
  // Falls back to the password itself if no dedicated SESSION_SECRET is
  // set — fine for a single-creator dashboard; set SESSION_SECRET for a
  // secret independent of the login password.
  return process.env.SESSION_SECRET || process.env.ROUTE_AUTH_PASSWORD || "";
}

export function authConfigured(): boolean {
  return !!(process.env.ROUTE_AUTH_USERNAME && process.env.ROUTE_AUTH_PASSWORD);
}

/** Constant-time string comparison — avoids a timing side-channel on login. */
function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ROUTE_AUTH_USERNAME || "";
  const expectedPass = process.env.ROUTE_AUTH_PASSWORD || "";
  if (!expectedUser || !expectedPass) return false;
  return constantTimeEqual(username, expectedUser) && constantTimeEqual(password, expectedPass);
}

async function hmacKey(): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(secretString());
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(payload: string): Promise<string> {
  const key = await hmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(signature);
}

export async function createSessionToken(): Promise<string> {
  const payload = `session:${Date.now() + MAX_AGE_SECONDS * 1000}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token || !secretString()) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await sign(payload);
  if (!constantTimeEqual(expected, signature)) return false;
  const expiresAt = Number(payload.split(":")[1]);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
