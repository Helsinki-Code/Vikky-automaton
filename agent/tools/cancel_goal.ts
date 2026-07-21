import { defineTool } from "eve/tools";
import { z } from "zod";
import { cancelGoal } from "../lib/goals";

export default defineTool({
  description: "Cancel an active goal — frees you to start a new one. Give an honest reason.",
  inputSchema: z.object({
    goalId: z.string().min(1),
    reason: z.string().min(5).max(1000),
  }),
  async execute({ goalId, reason }) {
    const goal = await cancelGoal(goalId, reason);
    if (!goal) return { cancelled: false, reason: `No goal with id ${goalId}.` };
    return { cancelled: true, goal };
  },
});
