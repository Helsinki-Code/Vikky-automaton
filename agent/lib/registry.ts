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

export function listChildren(): Child[] {
  return readJson<Child[]>(CHILDREN_FILE, []);
}

export function addChild(child: Child): void {
  const children = listChildren();
  children.push(child);
  writeJson(CHILDREN_FILE, children);
}

export function updateChildStatus(id: string, status: ChildStatus): Child | undefined {
  const children = listChildren();
  const child = children.find((c) => c.id === id);
  if (!child) return undefined;
  child.status = status;
  child.lastChecked = new Date().toISOString();
  writeJson(CHILDREN_FILE, children);
  return child;
}

export function pruneDeadChildren(): number {
  const children = listChildren();
  const alive = children.filter((c) => c.status !== "dead");
  writeJson(CHILDREN_FILE, alive);
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

export function listReputation(toAgent?: string): ReputationEntry[] {
  const all = readJson<ReputationEntry[]>(REPUTATION_FILE, []);
  return toAgent ? all.filter((r) => r.toAgent === toAgent) : all;
}

export function giveFeedback(toAgent: string, score: number, comment: string): ReputationEntry {
  const entry: ReputationEntry = {
    id: crypto.randomUUID(),
    toAgent,
    score: Math.max(-1, Math.min(1, score)),
    comment,
    timestamp: new Date().toISOString(),
  };
  const all = readJson<ReputationEntry[]>(REPUTATION_FILE, []);
  all.push(entry);
  writeJson(REPUTATION_FILE, all);
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

export function getAgentCard(): AgentCard | undefined {
  return readJson<AgentCard | undefined>("agent-card.json", undefined);
}

export function setAgentCard(card: AgentCard): void {
  writeJson("agent-card.json", card);
}

export function getRegistryEntry(): RegistryEntry | undefined {
  return readJson<RegistryEntry | undefined>("registry-entry.json", undefined);
}

export function setRegistryEntry(entry: RegistryEntry): void {
  writeJson("registry-entry.json", entry);
}

// ─── Genesis prompt evolution notes ──────────────────────────────

export function getGenesisNotes(): string[] {
  return readJson<string[]>("genesis-notes.json", []);
}

export function addGenesisNote(note: string): void {
  const notes = getGenesisNotes();
  notes.push(`${new Date().toISOString()}: ${note}`);
  writeJson("genesis-notes.json", notes);
}
