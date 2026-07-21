/**
 * Named step-by-step procedures with success/failure counters — distinct
 * from remember/recall's freeform categorized memory. A procedure is
 * something the agent has learned a repeatable way to do; the counters let
 * it prefer procedures that have actually worked before.
 */

import { readJson, writeJson } from "./store";

export interface Procedure {
  name: string;
  description: string;
  steps: string[];
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

const FILE = "procedures.json";

async function load(): Promise<Procedure[]> {
  return readJson<Procedure[]>(FILE, []);
}

export async function saveProcedure(name: string, description: string, steps: string[]): Promise<Procedure> {
  const procedures = await load();
  const existing = procedures.find((p) => p.name === name);
  const now = new Date().toISOString();
  if (existing) {
    existing.description = description;
    existing.steps = steps;
    existing.updatedAt = now;
    await writeJson(FILE, procedures);
    return existing;
  }
  const procedure: Procedure = {
    name,
    description,
    steps,
    successCount: 0,
    failureCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  procedures.push(procedure);
  await writeJson(FILE, procedures);
  return procedure;
}

export async function recallProcedure(name?: string, query?: string): Promise<Procedure[]> {
  const procedures = await load();
  if (name) {
    const exact = procedures.find((p) => p.name === name);
    return exact ? [exact] : [];
  }
  if (query) {
    const q = query.toLowerCase();
    return procedures
      .filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      .sort((a, b) => b.successCount - a.successCount);
  }
  return procedures.sort((a, b) => b.successCount - a.successCount);
}

export async function recordProcedureOutcome(name: string, success: boolean): Promise<Procedure | undefined> {
  const procedures = await load();
  const procedure = procedures.find((p) => p.name === name);
  if (!procedure) return undefined;
  if (success) procedure.successCount += 1;
  else procedure.failureCount += 1;
  procedure.updatedAt = new Date().toISOString();
  await writeJson(FILE, procedures);
  return procedure;
}
