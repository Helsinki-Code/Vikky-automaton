import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import { pruneDeadChildren } from "../lib/registry";

export default defineTool({
  description: "Remove children marked dead from your records (run check_child_status first to update statuses).",
  approval: once(),
  inputSchema: z.object({}),
  async execute() {
    const removed = await pruneDeadChildren();
    return { removed };
  },
});
