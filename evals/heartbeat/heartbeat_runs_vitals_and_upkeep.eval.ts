import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

/**
 * Dispatches the actual agent/schedules/heartbeat.ts task-mode prompt (the
 * same path production cron hits) and confirms it runs the vitals+upkeep
 * loop end to end, matching the instructions the schedule prompt gives.
 */
export default defineEval({
  description: "Dispatching the heartbeat schedule runs check_vitals and record_upkeep in task mode.",
  async test(t) {
    const { sessionIds } = await t.target.dispatchSchedule("heartbeat");
    await t.require(sessionIds.length, satisfies((n: number) => n > 0, "at least one session started"));

    const session = await t.target.attachSession(sessionIds[0]!);
    session.succeeded();
    session.calledTool("check_vitals", { count: 1 });
    session.calledTool("record_upkeep", { count: 1 });
  },
});
