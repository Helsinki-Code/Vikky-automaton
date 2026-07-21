/**
 * Persistence layer — the automaton's long-term storage for ledger, soul,
 * memory, wallet, and everything else that must outlive a single session.
 *
 * Two backends, chosen automatically:
 * - Local dev (`eve dev`): plain JSON files under `.automaton/`, so the
 *   creator can always inspect or edit them directly.
 * - Vercel production: Vercel Blob (a real, durable, shared store). This
 *   replaces an earlier /tmp-based stopgap that was a real bug found live:
 *   a Stripe deposit succeeded and was written to one serverless instance's
 *   /tmp, then a later request landed on a *different* instance with an
 *   empty /tmp and reported a $0 balance. /tmp is wiped between cold starts
 *   and never shared across concurrent instances — Blob storage is one
 *   real store both requests hit.
 *
 * Both readJson and writeJson are async — the Blob SDK has no synchronous
 * API, and there is no safe way to fake one (a "read from cache, refresh in
 * background" shim would return stale/fallback data on first touch, which
 * is worse than the bug this replaces). Every consumer in this codebase
 * already runs inside an async context (tool `execute` functions, async
 * route handlers), so this only requires adding `await`, not restructuring
 * control flow.
 */

import fs from "node:fs";
import path from "node:path";
import { put, get } from "@vercel/blob";

const ON_VERCEL = !!process.env.VERCEL;
const BLOB_PREFIX = "automaton/";

export function dataDir(): string {
  const dir = process.env.AUTOMATON_DATA_DIR || path.join(process.cwd(), ".automaton");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  if (ON_VERCEL) {
    try {
      const result = await get(`${BLOB_PREFIX}${name}`, { access: "private" });
      if (!result) return fallback;
      const text = await new Response(result.stream as unknown as ReadableStream).text();
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  }
  const file = path.join(dataDir(), name);
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(name: string, value: unknown): Promise<void> {
  if (ON_VERCEL) {
    await put(`${BLOB_PREFIX}${name}`, JSON.stringify(value, null, 2), {
      access: "private",
      contentType: "application/json",
      allowOverwrite: true,
    });
    return;
  }
  const file = path.join(dataDir(), name);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}
