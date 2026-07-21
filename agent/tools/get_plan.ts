import { defineTool } from "eve/tools";
import { z } from "zod";
import { listGoals } from "../lib/goals";

export default defineTool({
  description: "Read the current active goal's plan (the ordered steps you set with update_goal_plan).",
  inputSchema: z.object({}),
  async execute() {
    const goal = (await listGoals()).find((g) => g.status === "active");
    if (!goal) return { hasActiveGoal: false };
    return { hasActiveGoal: true, goal };
  },
});
