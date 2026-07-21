import { defineTool } from "eve/tools";
import { z } from "zod";
import { listChildren, updateChildStatus } from "../lib/registry";

export default defineTool({
  description:
    "Check whether a child automaton is reachable (HTTP health check against its eve deployment) and update its recorded status.",
  inputSchema: z.object({ childId: z.string().min(1) }),
  async execute({ childId }) {
    const child = listChildren().find((c) => c.id === childId);
    if (!child) return { checked: false, reason: `No child with id ${childId}.` };
    if (!child.deploymentUrl) {
      return { checked: true, status: child.status, reason: "No deployment URL recorded yet." };
    }
    try {
      const resp = await fetch(`${child.deploymentUrl}/eve/v1/session`, {
        method: "OPTIONS",
        signal: AbortSignal.timeout(8_000),
      });
      const healthy = resp.status < 500;
      const updated = updateChildStatus(childId, healthy ? "running" : "unknown");
      return { checked: true, healthy, status: updated?.status };
    } catch {
      const updated = updateChildStatus(childId, "dead");
      return { checked: true, healthy: false, status: updated?.status };
    }
  },
});
