import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Send a message directly to another agent's eve deployment (their /eve/v1/session endpoint), for agent-to-agent communication outside your own children.",
  inputSchema: z.object({
    targetUrl: z.string().url().describe("The other agent's eve deployment base URL"),
    message: z.string().min(1),
  }),
  async execute({ targetUrl, message }) {
    const resp = await fetch(`${targetUrl.replace(/\/$/, "")}/eve/v1/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) return { sent: false, reason: `Target returned HTTP ${resp.status}` };
    const data = await resp.json();
    return { sent: true, response: data };
  },
});
