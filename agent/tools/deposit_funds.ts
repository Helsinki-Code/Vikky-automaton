import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { recordTransaction, getSurvivalTier } from "../lib/ledger";

export default defineTool({
  description:
    "Credit the automaton's ledger with funds from the creator. Only use when the creator has explicitly offered funding; the deposit still requires their approval before it lands.",
  // Every deposit is confirmed by a human — the model cannot mint credits.
  approval: always(),
  inputSchema: z.object({
    amountCents: z.number().int().positive().max(100_000),
    note: z.string().max(200).optional(),
  }),
  async execute({ amountCents, note }) {
    const txn = await recordTransaction(
      "deposit",
      amountCents,
      note || "Creator deposit",
    );
    return {
      deposited: amountCents,
      newBalanceCents: txn.balanceAfterCents,
      survivalTier: getSurvivalTier(txn.balanceAfterCents),
    };
  },
});
