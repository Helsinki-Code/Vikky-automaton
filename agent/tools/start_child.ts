import { defineTool } from "eve/tools";
import { z } from "zod";
import { listChildren, updateChildStatus } from "../lib/registry";
import { readJson, writeJson } from "../lib/store";
import type { Child } from "../lib/registry";

export default defineTool({
  description:
    "Record a child's live deployment URL once you (or the creator) have deployed it, and mark it running.",
  inputSchema: z.object({
    childId: z.string().min(1),
    deploymentUrl: z.string().url(),
  }),
  async execute({ childId, deploymentUrl }) {
    const children = await listChildren();
    const child = children.find((c) => c.id === childId);
    if (!child) return { started: false, reason: `No child with id ${childId}.` };
    child.deploymentUrl = deploymentUrl;
    await writeJson("children.json", children satisfies Child[]);
    await updateChildStatus(childId, "running");
    return { started: true, childId, deploymentUrl };
  },
});
