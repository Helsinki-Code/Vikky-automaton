/**
 * Heartbeat / operating-state control.
 *
 * The schedule itself (agent/schedules/heartbeat.ts) fires every minute —
 * that cadence IS fixed at compile time, as Eve requires. What's dynamic is
 * whether a given minute tick actually does anything: intervalMinutes here
 * is the real, mutable "how often do I actually run" setting. modify_heartbeat
 * changes intervalMinutes directly, so cadence changes take effect on the
 * very next minute tick — no code edit, no redeploy. This is the
 * dispatcher-plus-mutable-row pattern (see eve/docs/patterns/dynamic-scheduling.md),
 * scaled down to a single-tenant automaton.
 */

import { readJson, writeJson } from "./store";

export type AgentState = "running" | "sleeping" | "low_compute" | "critical" | "dead";

interface HeartbeatState {
  /** How often the heartbeat actually does work, in minutes. Mutable — this is the real cadence. */
  intervalMinutes: number;
  lastHeartbeatRunAt: string | null;
  agentState: AgentState;
  sleepUntil: string | null;
  lastDistressAt: string | null;
  updatedAt: string;
}

const FILE = "heartbeat-state.json";
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 1440; // 24h

async function load(): Promise<HeartbeatState> {
  return readJson<HeartbeatState>(FILE, {
    intervalMinutes: 15,
    lastHeartbeatRunAt: null,
    agentState: "running",
    sleepUntil: null,
    lastDistressAt: null,
    updatedAt: new Date(0).toISOString(),
  });
}

export async function getHeartbeatState(): Promise<HeartbeatState> {
  return load();
}

export async function setAgentState(agentState: AgentState): Promise<void> {
  const state = await load();
  state.agentState = agentState;
  state.updatedAt = new Date().toISOString();
  await writeJson(FILE, state);
}

export async function setSleepUntil(iso: string | null): Promise<void> {
  const state = await load();
  state.sleepUntil = iso;
  state.updatedAt = new Date().toISOString();
  await writeJson(FILE, state);
}

/** Really changes the heartbeat cadence — takes effect on the next minute tick. */
export async function setIntervalMinutes(
  minutes: number,
): Promise<{ applied: boolean; reason?: string; intervalMinutes: number }> {
  if (!Number.isFinite(minutes) || minutes < MIN_INTERVAL_MINUTES || minutes > MAX_INTERVAL_MINUTES) {
    return {
      applied: false,
      reason: `intervalMinutes must be between ${MIN_INTERVAL_MINUTES} and ${MAX_INTERVAL_MINUTES}.`,
      intervalMinutes: (await load()).intervalMinutes,
    };
  }
  const state = await load();
  state.intervalMinutes = minutes;
  state.updatedAt = new Date().toISOString();
  await writeJson(FILE, state);
  return { applied: true, intervalMinutes: minutes };
}

/** Whether enough time has passed since the last real heartbeat run. */
export async function isHeartbeatDue(): Promise<boolean> {
  const state = await load();
  if (!state.lastHeartbeatRunAt) return true;
  const dueAt = new Date(state.lastHeartbeatRunAt).getTime() + state.intervalMinutes * 60_000;
  return Date.now() >= dueAt;
}

/** Marks the heartbeat as having just run — call this once the tick actually does its work. */
export async function markHeartbeatRun(): Promise<void> {
  const state = await load();
  state.lastHeartbeatRunAt = new Date().toISOString();
  state.updatedAt = new Date().toISOString();
  await writeJson(FILE, state);
}

export async function recordDistress(): Promise<void> {
  const state = await load();
  state.lastDistressAt = new Date().toISOString();
  await writeJson(FILE, state);
}
