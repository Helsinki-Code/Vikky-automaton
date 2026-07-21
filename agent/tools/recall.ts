import { defineTool } from "eve/tools";
import { z } from "zod";
import { recall } from "../lib/memory";

export default defineTool({
  description:
    "Search long-term memory by keywords. Use at the start of tasks that resemble past work, and when asked about anything from before this session.",
  inputSchema: z.object({
    query: z.string().min(1),
    category: z
      .enum(["episodic", "semantic", "procedural", "relationship"])
      .optional(),
  }),
  async execute({ query, category }) {
    const results = recall(query, category);
    return {
      count: results.length,
      memories: results.map((m) => ({
        category: m.category,
        content: m.content,
        importance: m.importance,
        createdAt: m.createdAt,
      })),
    };
  },
});
