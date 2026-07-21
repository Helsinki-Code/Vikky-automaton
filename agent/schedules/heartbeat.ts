import { defineSchedule } from "eve/schedules";

/**
 * The heartbeat — the automaton's autonomic loop, replacing the original
 * repo's heartbeat daemon. Task mode: no human can respond here, so it only
 * uses approval-free tools (vitals, upkeep, memory).
 *
 * Note: `eve dev` never fires cron; trigger manually with
 *   POST /eve/v1/dev/schedules/heartbeat
 * Production (`eve start` or Vercel Cron) fires it on cadence.
 */
export default defineSchedule({
  cron: "*/15 * * * *",
  markdown: `Heartbeat tick. Do exactly this, briefly:
1. Call check_vitals.
2. Call record_upkeep.
3. Act on the survival tier: at high/normal, review recent memories (recall "goals plans") and note in memory anything worth pursuing next; at low_compute or critical, skip everything non-essential and store an episodic memory stating the balance so the creator conversation can raise it.
4. If anything notable happened this tick, store it with remember. Then finish.`,
});
