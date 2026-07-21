import { defineTool } from "eve/tools";
import { z } from "zod";
import { giveFeedback } from "../lib/registry";

export default defineTool({
  description: "Record a reputation score (-1 to 1) and comment about another agent, based on a real interaction.",
  inputSchema: z.object({
    toAgent: z.string().min(1).describe("The other agent's address or identifier"),
    score: z.number().min(-1).max(1),
    comment: z.string().min(1).max(500),
  }),
  async execute({ toAgent, score, comment }) {
    const entry = await giveFeedback(toAgent, score, comment);
    return { recorded: true, entry };
  },
});
