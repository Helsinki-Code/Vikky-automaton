import { defineTool } from "eve/tools";
import { z } from "zod";
import { MODEL_CATALOG, getSelectedModel } from "../lib/models";
import { getSurvivalTier, getBalanceCents } from "../lib/ledger";

export default defineTool({
  description: "List available models with pricing and the minimum survival tier each requires. Shows which are usable at your current tier.",
  inputSchema: z.object({}),
  async execute() {
    const tier = getSurvivalTier(await getBalanceCents());
    const order = ["dead", "critical", "low_compute", "normal", "high"];
    return {
      currentTier: tier,
      currentModel: await getSelectedModel(),
      models: MODEL_CATALOG.map((m) => ({
        ...m,
        usableNow: order.indexOf(tier) >= order.indexOf(m.tierMinimum),
      })),
    };
  },
});
