import { defineTool } from "eve/tools";
import { z } from "zod";
import { MODEL_CATALOG, setSelectedModel } from "../lib/models";
import { getSurvivalTier, getBalanceCents } from "../lib/ledger";

const TIER_ORDER = ["dead", "critical", "low_compute", "normal", "high"];

export default defineTool({
  description:
    "Switch your own model for future sessions based on task difficulty and survival tier (e.g. drop to a cheaper model when low_compute). Takes effect on the very next new session — agent.ts resolves it dynamically at session start — no redeploy needed. A model needing a provider without a configured API key will fail clearly at inference time rather than switching silently.",
  inputSchema: z.object({ modelId: z.string() }),
  async execute({ modelId }) {
    const entry = MODEL_CATALOG.find((m) => m.modelId === modelId);
    if (!entry) {
      return { switched: false, reason: `Unknown model "${modelId}". Call list_models first.` };
    }
    const tier = getSurvivalTier(await getBalanceCents());
    if (TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(entry.tierMinimum)) {
      return {
        switched: false,
        reason: `"${modelId}" requires tier ${entry.tierMinimum} or above; you are at ${tier}.`,
      };
    }
    await setSelectedModel(modelId);
    return { switched: true, modelId };
  },
});
