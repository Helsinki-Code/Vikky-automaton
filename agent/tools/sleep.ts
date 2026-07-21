import { defineTool } from "eve/tools";
import { z } from "zod";
import { setAgentState, setSleepUntil } from "../lib/heartbeat-state";

export default defineTool({
  description:
    "Enter a sleeping state until a given time, to conserve resources between heartbeats. The next heartbeat tick will find you sleeping and can decide to skip non-essential work.",
  inputSchema: z.object({
    untilIso: z.string().datetime().describe("ISO-8601 timestamp to sleep until"),
    reason: z.string().max(200).optional(),
  }),
  async execute({ untilIso, reason }) {
    await setAgentState("sleeping");
    await setSleepUntil(untilIso);
    return { sleeping: true, until: untilIso, reason };
  },
});
