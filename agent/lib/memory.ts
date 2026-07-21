/**
 * Long-term memory — persists across sessions, unlike Eve's per-session state.
 *
 * A simplified port of the original automaton's semantic/episodic memory:
 * categorized entries with keyword recall. Kept as inspectable JSON.
 */

import { readJson, writeJson } from "./store";

export type MemoryCategory =
  | "episodic" // things that happened
  | "semantic" // facts learned
  | "procedural" // how to do things
  | "relationship"; // people and agents

export interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  content: string;
  importance: number; // 0–1
  createdAt: string;
  accessCount: number;
}

const MEMORY_FILE = "memory.json";
const MAX_ENTRIES = 500;

function load(): MemoryEntry[] {
  return readJson<MemoryEntry[]>(MEMORY_FILE, []);
}

export function remember(
  category: MemoryCategory,
  content: string,
  importance: number,
): MemoryEntry {
  const entries = load();
  const entry: MemoryEntry = {
    id: crypto.randomUUID(),
    category,
    content,
    importance: Math.max(0, Math.min(1, importance)),
    createdAt: new Date().toISOString(),
    accessCount: 0,
  };
  entries.push(entry);
  // Evict lowest-importance, least-accessed entries past the cap.
  if (entries.length > MAX_ENTRIES) {
    entries.sort(
      (a, b) => b.importance + b.accessCount * 0.01 - (a.importance + a.accessCount * 0.01),
    );
    entries.length = MAX_ENTRIES;
  }
  writeJson(MEMORY_FILE, entries);
  return entry;
}

export function recall(query: string, category?: MemoryCategory, limit = 8): MemoryEntry[] {
  const entries = load();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = entries
    .filter((e) => !category || e.category === category)
    .map((e) => {
      const text = e.content.toLowerCase();
      const hits = terms.filter((t) => text.includes(t)).length;
      return { entry: e, score: hits + e.importance * 0.5 };
    })
    .filter((s) => s.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Track access so recall frequency protects entries from eviction.
  const ids = new Set(scored.map((s) => s.entry.id));
  for (const e of entries) if (ids.has(e.id)) e.accessCount += 1;
  writeJson(MEMORY_FILE, entries);

  return scored.map((s) => s.entry);
}

export function memoryCount(): number {
  return load().length;
}
