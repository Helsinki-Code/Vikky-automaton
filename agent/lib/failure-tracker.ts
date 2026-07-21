/**
 * Tracks consecutive tool-call failures across the whole agent (not
 * per-tool) so agent/hooks/alert-on-failures.ts can page the creator when
 * something is actually broken (e.g. a misconfigured API key causing every
 * call to error) rather than one-off failures a model naturally recovers
 * from.
 */

import { readJson, writeJson } from "./store";

interface FailureState {
  consecutiveFailures: number;
  lastAlertedAt: string | null;
}

const FILE = "failure-tracker.json";
const ALERT_THRESHOLD = 3;
const ALERT_COOLDOWN_MS = 30 * 60_000;

async function load(): Promise<FailureState> {
  return readJson<FailureState>(FILE, { consecutiveFailures: 0, lastAlertedAt: null });
}

/** Returns true if this failure crossed the threshold and an alert should fire (cooldown-limited). */
export async function recordToolFailure(): Promise<boolean> {
  const state = await load();
  state.consecutiveFailures += 1;
  let shouldAlert = false;
  if (state.consecutiveFailures >= ALERT_THRESHOLD) {
    const cooledDown = !state.lastAlertedAt || Date.now() - new Date(state.lastAlertedAt).getTime() >= ALERT_COOLDOWN_MS;
    if (cooledDown) {
      shouldAlert = true;
      state.lastAlertedAt = new Date().toISOString();
    }
  }
  await writeJson(FILE, state);
  return shouldAlert;
}

export async function recordToolSuccess(): Promise<void> {
  const state = await load();
  if (state.consecutiveFailures === 0) return;
  state.consecutiveFailures = 0;
  await writeJson(FILE, state);
}
