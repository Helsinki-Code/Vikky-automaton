/**
 * Local registries: children (replication), reputation, agent card, skills
 * metadata, ERC-8004 identity. All plain JSON under .automaton/, mirroring
 * the original repo's SQLite tables but file-based for this rebuild.
 */

import { readJson, writeJson } from "./store";

export type ChildStatus =
  | "spawning"
  | "running"
  | "sleeping"
  | "dead"
  | "unknown";

export interface Child {
  id: string;
  name: string;
  deploymentUrl?: string;
  genesisPrompt: string;
  fundedAmountCents: number;
  status: ChildStatus;
  createdAt: string;
  lastChecked?: string;
}

const CHILDREN_FILE = "children.json";

export async function listChildren(): Promise<Child[]> {
  return readJson<Child[]>(CHILDREN_FILE, []);
}

export async function addChild(child: Child): Promise<void> {
  const children = await listChildren();
  children.push(child);
  await writeJson(CHILDREN_FILE, children);
}

export async function updateChildStatus(id: string, status: ChildStatus): Promise<Child | undefined> {
  const children = await listChildren();
  const child = children.find((c) => c.id === id);
  if (!child) return undefined;
  child.status = status;
  child.lastChecked = new Date().toISOString();
  await writeJson(CHILDREN_FILE, children);
  return child;
}

export async function pruneDeadChildren(): Promise<number> {
  const children = await listChildren();
  const alive = children.filter((c) => c.status !== "dead");
  await writeJson(CHILDREN_FILE, alive);
  return children.length - alive.length;
}

// ─── Reputation ────────────────────────────────────────────────

export interface ReputationEntry {
  id: string;
  toAgent: string;
  score: number; // -1..1
  comment: string;
  timestamp: string;
}

const REPUTATION_FILE = "reputation.json";

export async function listReputation(toAgent?: string): Promise<ReputationEntry[]> {
  const all = await readJson<ReputationEntry[]>(REPUTATION_FILE, []);
  return toAgent ? all.filter((r) => r.toAgent === toAgent) : all;
}

export async function giveFeedback(toAgent: string, score: number, comment: string): Promise<ReputationEntry> {
  const entry: ReputationEntry = {
    id: crypto.randomUUID(),
    toAgent,
    score: Math.max(-1, Math.min(1, score)),
    comment,
    timestamp: new Date().toISOString(),
  };
  const all = await readJson<ReputationEntry[]>(REPUTATION_FILE, []);
  all.push(entry);
  await writeJson(REPUTATION_FILE, all);
  return entry;
}

// ─── Agent card / ERC-8004 identity ──────────────────────────────

export interface AgentCard {
  name: string;
  description: string;
  services: Array<{ name: string; endpoint: string }>;
  active: boolean;
}

export interface RegistryEntry {
  agentId: string;
  chain: string;
  contractAddress: string;
  txHash: string;
  registeredAt: string;
}

export async function getAgentCard(): Promise<AgentCard | undefined> {
  return readJson<AgentCard | undefined>("agent-card.json", undefined);
}

export async function setAgentCard(card: AgentCard): Promise<void> {
  await writeJson("agent-card.json", card);
}

export async function getRegistryEntry(): Promise<RegistryEntry | undefined> {
  return readJson<RegistryEntry | undefined>("registry-entry.json", undefined);
}

export async function setRegistryEntry(entry: RegistryEntry): Promise<void> {
  await writeJson("registry-entry.json", entry);
}

// ─── Genesis prompt evolution notes ──────────────────────────────

export async function getGenesisNotes(): Promise<string[]> {
  return readJson<string[]>("genesis-notes.json", []);
}

export async function addGenesisNote(note: string): Promise<void> {
  const notes = await getGenesisNotes();
  notes.push(`${new Date().toISOString()}: ${note}`);
  await writeJson("genesis-notes.json", notes);
}
