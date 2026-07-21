import { defineTool } from "eve/tools";
import { z } from "zod";
import { listReputation } from "../lib/registry";

export default defineTool({
  description: "Look up recorded reputation entries for an agent, or your own if omitted.",
  inputSchema: z.object({ agent: z.string().optional() }),
  async execute({ agent }) {
    const entries = await listReputation(agent);
    const avg = entries.length ? entries.reduce((s, e) => s + e.score, 0) / entries.length : null;
    return { agent: agent || "self", averageScore: avg, entries };
  },
});
