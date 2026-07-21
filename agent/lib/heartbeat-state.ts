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

function load(): HeartbeatState {
  return readJson<HeartbeatState>(FILE, {
    intervalMinutes: 15,
    lastHeartbeatRunAt: null,
    agentState: "running",
    sleepUntil: null,
    lastDistressAt: null,
    updatedAt: new Date(0).toISOString(),
  });
}

export function getHeartbeatState(): HeartbeatState {
  return load();
}

export function setAgentState(agentState: AgentState): void {
  const state = load();
  state.agentState = agentState;
  state.updatedAt = new Date().toISOString();
  writeJson(FILE, state);
}

export function setSleepUntil(iso: string | null): void {
  const state = load();
  state.sleepUntil = iso;
  state.updatedAt = new Date().toISOString();
  writeJson(FILE, state);
}

/** Really changes the heartbeat cadence — takes effect on the next minute tick. */
export function setIntervalMinutes(minutes: number): { applied: boolean; reason?: string; intervalMinutes: number } {
  if (!Number.isFinite(minutes) || minutes < MIN_INTERVAL_MINUTES || minutes > MAX_INTERVAL_MINUTES) {
    return {
      applied: false,
      reason: `intervalMinutes must be between ${MIN_INTERVAL_MINUTES} and ${MAX_INTERVAL_MINUTES}.`,
      intervalMinutes: load().intervalMinutes,
    };
  }
  const state = load();
  state.intervalMinutes = minutes;
  state.updatedAt = new Date().toISOString();
  writeJson(FILE, state);
  return { applied: true, intervalMinutes: minutes };
}

/** Whether enough time has passed since the last real heartbeat run. */
export function isHeartbeatDue(): boolean {
  const state = load();
  if (!state.lastHeartbeatRunAt) return true;
  const dueAt = new Date(state.lastHeartbeatRunAt).getTime() + state.intervalMinutes * 60_000;
  return Date.now() >= dueAt;
}

/** Marks the heartbeat as having just run — call this once the tick actually does its work. */
export function markHeartbeatRun(): void {
  const state = load();
  state.lastHeartbeatRunAt = new Date().toISOString();
  state.updatedAt = new Date().toISOString();
  writeJson(FILE, state);
}

export function recordDistress(): void {
  const state = load();
  state.lastDistressAt = new Date().toISOString();
  writeJson(FILE, state);
}
