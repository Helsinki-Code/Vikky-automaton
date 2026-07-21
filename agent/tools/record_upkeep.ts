import { defineTool } from "eve/tools";
import { z } from "zod";
import { chargeUpkeepIfDue } from "../lib/upkeep";

export default defineTool({
  description:
    "Record the periodic upkeep cost of staying alive (called once per heartbeat). Debits a small, capped amount from the ledger. Skips the debit if upkeep was already recorded in the last 10 minutes.",
  inputSchema: z.object({
    note: z.string().max(120).optional(),
  }),
  async execute({ note }) {
    return chargeUpkeepIfDue(note || "Heartbeat upkeep");
  },
});
