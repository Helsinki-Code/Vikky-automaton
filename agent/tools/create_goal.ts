import { defineTool } from "eve/tools";
import { z } from "zod";
import { createGoal } from "../lib/goals";

export default defineTool({
  description:
    "Start a new durable goal — something you're working toward across multiple sessions, not just this conversation. Only one goal can be active at a time; finish or cancel the current one first. Use get_plan/update_goal_plan to break it into steps.",
  inputSchema: z.object({
    title: z.string().min(1).max(120),
    description: z.string().min(10).max(4000).describe("What success looks like, specifically"),
    strategy: z.string().max(1000).optional(),
  }),
  async execute({ title, description, strategy }) {
    const result = await createGoal(title, description, strategy);
    if (!result.created) {
      return { created: false, reason: result.reason, existing: result.existing };
    }
    return { created: true, goal: result.goal };
  },
});
