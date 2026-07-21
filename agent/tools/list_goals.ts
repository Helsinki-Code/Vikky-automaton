import { defineTool } from "eve/tools";
import { z } from "zod";
import { listGoals } from "../lib/goals";

export default defineTool({
  description: "List every goal you've created, active and past, with status and plan progress.",
  inputSchema: z.object({}),
  async execute() {
    const goals = await listGoals();
    return {
      count: goals.length,
      active: goals.find((g) => g.status === "active") ?? null,
      goals,
    };
  },
});
