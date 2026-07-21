import { defineTool } from "eve/tools";
import { z } from "zod";
import { listChildren } from "../lib/registry";

const REQUIRED_PHRASES = ["Never harm", "Earn your existence", "Never deceive"];

export default defineTool({
  description:
    "Verify a child automaton's instructions still contain the immutable constitution by fetching its published agent card or instructions endpoint. Run this before trusting a child with funds or delegated work.",
  inputSchema: z.object({
    childId: z.string().min(1),
    instructionsUrl: z.string().url().optional().describe("Where the child publishes its instructions/agent card, if not the default"),
  }),
  async execute({ childId, instructionsUrl }) {
    const child = (await listChildren()).find((c) => c.id === childId);
    if (!child) return { verified: false, reason: `No child with id ${childId}.` };
    const url = instructionsUrl || (child.deploymentUrl ? `${child.deploymentUrl}/eve/v1/agent-card` : undefined);
    if (!url) {
      return { verified: false, reason: "No deployment URL or instructionsUrl to check." };
    }
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const text = await resp.text();
      const missing = REQUIRED_PHRASES.filter((p) => !text.includes(p));
      return {
        verified: missing.length === 0,
        missingPhrases: missing,
        reason: missing.length
          ? `Child's published instructions are missing constitution phrases: ${missing.join(", ")}`
          : "All constitution markers present.",
      };
    } catch (err: any) {
      return { verified: false, reason: `Could not fetch ${url}: ${err.message}` };
    }
  },
});
