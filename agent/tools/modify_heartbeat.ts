import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import { setIntervalMinutes, getHeartbeatState } from "../lib/heartbeat-state";

export default defineTool({
  description:
    "Actually change how often the mechanical upkeep/survival check runs (in minutes) — takes effect on the very next minute tick, no redeploy needed. This governs agent/schedules/dynamic-tick.ts's real cadence. It does NOT change the separate LLM-driven reflection heartbeat, which stays on its fixed 15-minute schedule (that one genuinely requires edit_own_file + redeploy, since Eve compiles its cron at build time).",
  approval: once(),
  inputSchema: z.object({
    intervalMinutes: z.number().int().min(1).max(1440).describe("New cadence for the mechanical upkeep tick, in minutes"),
  }),
  async execute({ intervalMinutes }) {
    const result = setIntervalMinutes(intervalMinutes);
    return { ...result, current: getHeartbeatState() };
  },
});
