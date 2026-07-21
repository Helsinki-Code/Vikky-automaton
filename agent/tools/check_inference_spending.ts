import { defineTool } from "eve/tools";
import { z } from "zod";
import { getSpendSummary } from "../lib/models";

export default defineTool({
  description: "Report inference cost over a lookback window (default 24h): total, per-model breakdown, call count.",
  inputSchema: z.object({ sinceHours: z.number().int().min(1).max(720).default(24) }),
  async execute({ sinceHours }) {
    return getSpendSummary(sinceHours);
  },
});
