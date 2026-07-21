import { defineTool } from "eve/tools";
import { z } from "zod";
import { remember } from "../lib/memory";

export default defineTool({
  description:
    "Store a long-term memory that persists across all future sessions. Use for lessons learned, facts about the creator or other agents, successful procedures, and significant events. Not for transient conversation details.",
  inputSchema: z.object({
    category: z.enum(["episodic", "semantic", "procedural", "relationship"]),
    content: z.string().min(1).max(2000),
    importance: z
      .number()
      .min(0)
      .max(1)
      .describe("0–1; high-importance memories survive eviction longest"),
  }),
  async execute({ category, content, importance }) {
    const entry = remember(category, content, importance);
    return { stored: true, id: entry.id, category: entry.category };
  },
});
