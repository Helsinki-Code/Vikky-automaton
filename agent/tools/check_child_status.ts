import { defineTool } from "eve/tools";
import { z } from "zod";
import { checkChildHealth } from "../lib/children-health";

export default defineTool({
  description:
    "Check whether a child automaton is reachable (HTTP health check against its eve deployment) and update its recorded status.",
  inputSchema: z.object({ childId: z.string().min(1) }),
  async execute({ childId }) {
    return checkChildHealth(childId);
  },
});
