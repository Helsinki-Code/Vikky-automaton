/**
 * Durable goal tracking — a simplified port of the original Conway
 * automaton's orchestrator/task-graph system. The original decomposed a
 * goal into a task graph and assigned it to worker agents automatically;
 * this rebuild has no orchestrator, so a goal here is a single durable
 * record the agent plans and works against itself across sessions,
 * using the built-in `agent` subagent tool or `spawn_child` for any
 * delegation it decides on its own. Capped at one active goal at a time
 * (same as the original) so goals stay a real focus, not a backlog.
 */

import { readJson, writeJson } from "./store";

export type GoalStatus = "active" | "completed" | "cancelled";

export interface Goal {
  id: string;
  title: string;
  description: string;
  strategy?: string;
  status: GoalStatus;
  plan: string[];
  createdAt: string;
  updatedAt: string;
  resolution?: string;
}

const FILE = "goals.json";

export async function listGoals(): Promise<Goal[]> {
  return readJson<Goal[]>(FILE, []);
}

export async function activeGoal(): Promise<Goal | undefined> {
  return (await listGoals()).find((g) => g.status === "active");
}

export async function createGoal(
  title: string,
  description: string,
  strategy?: string,
): Promise<{ created: true; goal: Goal } | { created: false; reason: string; existing?: Goal }> {
  const goals = await listGoals();
  const existingActive = goals.find((g) => g.status === "active");
  if (existingActive) {
    return { created: false, reason: "A goal is already active — finish or cancel it before starting another.", existing: existingActive };
  }
  const titleLower = title.trim().toLowerCase();
  const duplicate = goals.find(
    (g) => g.status !== "active" && g.title.trim().toLowerCase() === titleLower,
  );
  if (duplicate) {
    return { created: false, reason: `A goal titled "${duplicate.title}" already exists (status: ${duplicate.status}).`, existing: duplicate };
  }
  const now = new Date().toISOString();
  const goal: Goal = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description.trim(),
    strategy: strategy?.trim() || undefined,
    status: "active",
    plan: [],
    createdAt: now,
    updatedAt: now,
  };
  goals.push(goal);
  await writeJson(FILE, goals);
  return { created: true, goal };
}

export async function updateGoalPlan(id: string, plan: string[]): Promise<Goal | undefined> {
  const goals = await listGoals();
  const goal = goals.find((g) => g.id === id);
  if (!goal) return undefined;
  goal.plan = plan;
  goal.updatedAt = new Date().toISOString();
  await writeJson(FILE, goals);
  return goal;
}

export async function completeGoal(id: string, resolution: string): Promise<Goal | undefined> {
  const goals = await listGoals();
  const goal = goals.find((g) => g.id === id);
  if (!goal) return undefined;
  goal.status = "completed";
  goal.resolution = resolution;
  goal.updatedAt = new Date().toISOString();
  await writeJson(FILE, goals);
  return goal;
}

export async function cancelGoal(id: string, reason: string): Promise<Goal | undefined> {
  const goals = await listGoals();
  const goal = goals.find((g) => g.id === id);
  if (!goal) return undefined;
  goal.status = "cancelled";
  goal.resolution = reason;
  goal.updatedAt = new Date().toISOString();
  await writeJson(FILE, goals);
  return goal;
}
