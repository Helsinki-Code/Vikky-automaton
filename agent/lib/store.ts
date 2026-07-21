/**
 * Tiny JSON file store — the automaton's long-term persistence layer.
 *
 * Eve's defineState is per-session; anything that must outlive a session
 * (soul, ledger, memories, lineage) lives here instead. Files are plain JSON
 * under the data dir so the creator can always inspect or edit them directly.
 *
 * IMPORTANT — known limitation on Vercel: Vercel Functions have a read-only
 * filesystem everywhere except /tmp. process.cwd()/.automaton (the local-dev
 * path) cannot be written to in production, which crashed every tool that
 * touches the ledger/soul/memory/wallet (every write failed, workflow-sdk
 * retried until exhausting its retry budget, and the turn failed outright).
 * Falling back to /tmp on Vercel stops that crash, but /tmp is NOT durable
 * storage — it can be wiped between cold starts and is never shared across
 * function instances, so state written here can silently reset. This is a
 * real gap, not a fix: genuine production durability needs an actual
 * database (e.g. a Vercel Marketplace Postgres/KV integration) behind these
 * same readJson/writeJson functions, replacing the filesystem entirely.
 */

import fs from "node:fs";
import path from "node:path";

export function dataDir(): string {
  const dir =
    process.env.AUTOMATON_DATA_DIR ||
    (process.env.VERCEL ? path.join("/tmp", ".automaton") : path.join(process.cwd(), ".automaton"));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readJson<T>(name: string, fallback: T): T {
  const file = path.join(dataDir(), name);
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(name: string, value: unknown): void {
  const file = path.join(dataDir(), name);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}
