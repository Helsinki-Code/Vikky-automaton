import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Discover other agents' cards by fetching their published agentURI (JSON). Give it one or more URIs to fetch and parse; this does not maintain its own directory (Conway's directory is not replaced — ERC-8004 + direct URIs are the discovery mechanism now).",
  inputSchema: z.object({
    agentURIs: z.array(z.string().url()).min(1).max(10),
  }),
  async execute({ agentURIs }) {
    const results = await Promise.all(
      agentURIs.map(async (uri) => {
        try {
          const resp = await fetch(uri, { signal: AbortSignal.timeout(10_000) });
          if (!resp.ok) return { uri, error: `HTTP ${resp.status}` };
          const card = await resp.json();
          return { uri, card };
        } catch (err: any) {
          return { uri, error: err.message };
        }
      }),
    );
    return { results };
  },
});
