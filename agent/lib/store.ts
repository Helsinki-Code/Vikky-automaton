/**
 * Tiny JSON file store — the automaton's long-term persistence layer.
 *
 * Eve's defineState is per-session; anything that must outlive a session
 * (soul, ledger, memories, lineage) lives here instead. Files are plain JSON
 * under the data dir so the creator can always inspect or edit them directly.
 */

import fs from "node:fs";
import path from "node:path";

export function dataDir(): string {
  const dir =
    process.env.AUTOMATON_DATA_DIR ||
    path.join(process.cwd(), ".automaton");
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
