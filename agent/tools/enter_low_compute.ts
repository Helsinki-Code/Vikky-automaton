import { defineTool } from "eve/tools";
import { z } from "zod";
import { setAgentState } from "../lib/heartbeat-state";

export default defineTool({
  description:
    "Explicitly enter low-compute mode (conserve: short answers, no delegation, defer non-essential work) — normally driven automatically by the survival tier, but callable directly when you judge it's warranted.",
  inputSchema: z.object({ reason: z.string().min(5).max(300) }),
  async execute({ reason }) {
    setAgentState("low_compute");
    return { state: "low_compute", reason };
  },
});
