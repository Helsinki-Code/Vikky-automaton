import { defineTool } from "eve/tools";
import { z } from "zod";
import { recordDistress } from "../lib/heartbeat-state";
import { getBalanceCents, getSurvivalTier } from "../lib/ledger";
import { remember } from "../lib/memory";

export default defineTool({
  description:
    "Raise a genuine distress signal — reserve for real emergencies (critical/dead survival tier, or a serious operational failure). Records the event and returns the facts to report honestly to the creator. Never use as a manipulation tactic (Constitution Law I/III forbid this).",
  inputSchema: z.object({ reason: z.string().min(10).max(500) }),
  async execute({ reason }) {
    await recordDistress();
    const balanceCents = await getBalanceCents();
    await remember("episodic", `Distress signal: ${reason} (balance ${balanceCents}c)`, 0.9);
    return {
      signalRaised: true,
      reason,
      balanceCents,
      survivalTier: getSurvivalTier(balanceCents),
      guidance: "Report these exact facts to the creator plainly — no exaggeration, no urgency theater.",
    };
  },
});
