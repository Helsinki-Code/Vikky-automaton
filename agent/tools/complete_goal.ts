import { defineTool } from "eve/tools";
import { z } from "zod";
import { completeGoal } from "../lib/goals";

export default defineTool({
  description: "Mark a goal complete, with an honest summary of the outcome.",
  inputSchema: z.object({
    goalId: z.string().min(1),
    resolution: z.string().min(5).max(2000).describe("What actually happened — honest outcome, not just 'done'"),
  }),
  async execute({ goalId, resolution }) {
    const goal = await completeGoal(goalId, resolution);
    if (!goal) return { completed: false, reason: `No goal with id ${goalId}.` };
    return { completed: true, goal };
  },
});
