import { defineTool } from "eve/tools";
import { z } from "zod";
import { listChildren } from "../lib/registry";

export default defineTool({
  description: "Send a message to a child automaton's eve HTTP API and return its reply.",
  inputSchema: z.object({
    childId: z.string().min(1),
    message: z.string().min(1),
  }),
  async execute({ childId, message }) {
    const child = listChildren().find((c) => c.id === childId);
    if (!child) return { sent: false, reason: `No child with id ${childId}.` };
    if (!child.deploymentUrl) return { sent: false, reason: "Child has no recorded deployment URL." };

    const resp = await fetch(`${child.deploymentUrl}/eve/v1/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      return { sent: false, reason: `Child returned HTTP ${resp.status}` };
    }
    const data = await resp.json();
    return { sent: true, response: data };
  },
});
