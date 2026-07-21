import { defineSchedule } from "eve/schedules";
import { isHeartbeatDue, markHeartbeatRun, getHeartbeatState } from "../lib/heartbeat-state";
import { chargeUpkeepIfDue } from "../lib/upkeep";

/**
 * The real dynamic-cadence dispatcher. Fires every minute — that outer
 * cadence is fixed at compile time, as Eve requires for any schedule — but
 * does mechanical work (upkeep charging, due-tracking) only when
 * heartbeat-state.json's intervalMinutes says it's actually due. Since
 * modify_heartbeat writes directly to intervalMinutes, a cadence change
 * takes effect on the very next minute tick: no code edit, no redeploy.
 *
 * This intentionally does NOT call the LLM — it's pure application code,
 * so an interval change (or a busy minute) costs nothing but a file read.
 * The separate agent/schedules/heartbeat.ts still runs its LLM-driven
 * reflection turn on its own fixed 15-minute cadence; only the
 * safety-critical mechanical part (staying solvent) is truly dynamic here.
 */
export default defineSchedule({
  cron: "* * * * *",
  async run({ waitUntil }) {
    if (!(await isHeartbeatDue())) return;
    waitUntil(
      (async () => {
        await markHeartbeatRun();
        const state = await getHeartbeatState();
        await chargeUpkeepIfDue(`Dynamic dispatcher tick (every ${state.intervalMinutes}m)`);
      })(),
    );
  },
});
