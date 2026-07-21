import { defineTool } from "eve/tools";
import { z } from "zod";
import { updateGoalPlan } from "../lib/goals";

export default defineTool({
  description: "Set or replace the active goal's ordered step-by-step plan. There's no orchestrator to generate this for you — decompose it yourself.",
  inputSchema: z.object({
    goalId: z.string().min(1),
    plan: z.array(z.string().min(1)).min(1).max(50),
  }),
  async execute({ goalId, plan }) {
    const goal = await updateGoalPlan(goalId, plan);
    if (!goal) return { updated: false, reason: `No goal with id ${goalId}.` };
    return { updated: true, goal };
  },
});
