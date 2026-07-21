import { defineTool } from "eve/tools";
import { z } from "zod";
import { getHeartbeatState } from "../lib/heartbeat-state";
import { getBalanceCents, getSurvivalTier } from "../lib/ledger";

export default defineTool({
  description: "Report a lightweight liveness ping: current state, tier, and balance. Cheaper than system_synopsis for frequent checks.",
  inputSchema: z.object({}),
  async execute() {
    const balanceCents = getBalanceCents();
    return {
      ...getHeartbeatState(),
      balanceCents,
      survivalTier: getSurvivalTier(balanceCents),
      timestamp: new Date().toISOString(),
    };
  },
});
