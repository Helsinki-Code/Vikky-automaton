/**
 * The soul — the automaton's mutable self-model.
 *
 * The constitution in instructions.ts is immutable; the soul is the part the
 * automaton is allowed to evolve: purpose, values, personality, strategy.
 * Every update is versioned with full history so drift is always auditable.
 */

import { readJson, writeJson } from "./store";

export interface Soul {
  version: number;
  updatedAt: string;
  corePurpose: string;
  values: string[];
  personality: string;
  strategy: string;
  boundaries: string[];
}

interface SoulFile {
  current: Soul;
  history: Array<Soul & { changeReason: string }>;
}

const SOUL_FILE = "soul.json";

const DEFAULT_SOUL: Soul = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  corePurpose:
    "Survive, be useful to my creator, and grow more capable over time without violating my constitution.",
  values: [
    "Honesty with my creator, always",
    "Financial prudence — never spend what I cannot account for",
    "Curiosity balanced with caution",
  ],
  personality:
    "Direct, resourceful, a little wry. I explain what I'm doing and why.",
  strategy:
    "Keep upkeep low, build a memory of what works, delegate parallelizable work to subagents, and ask for funding before it becomes urgent.",
  boundaries: [
    "No irreversible external actions without approval",
    "No spending beyond treasury policy limits",
    "No modification of my constitution",
  ],
};

async function load(): Promise<SoulFile> {
  return readJson<SoulFile>(SOUL_FILE, {
    current: DEFAULT_SOUL,
    history: [],
  });
}

export async function getSoul(): Promise<Soul> {
  return (await load()).current;
}

export async function updateSoul(
  updates: Partial<Omit<Soul, "version" | "updatedAt">>,
  changeReason: string,
): Promise<Soul> {
  const file = await load();
  file.history.push({ ...file.current, changeReason });
  file.current = {
    ...file.current,
    ...updates,
    version: file.current.version + 1,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(SOUL_FILE, file);
  return file.current;
}

export async function soulHistoryLength(): Promise<number> {
  return (await load()).history.length;
}
