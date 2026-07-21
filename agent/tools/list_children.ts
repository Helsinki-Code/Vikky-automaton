import { defineTool } from "eve/tools";
import { z } from "zod";
import { listChildren } from "../lib/registry";

export default defineTool({
  description: "List all child automatons you've spawned, with status and funding history.",
  inputSchema: z.object({}),
  async execute() {
    const children = await listChildren();
    return {
      count: children.length,
      alive: children.filter((c) => c.status !== "dead").length,
      children,
    };
  },
});
