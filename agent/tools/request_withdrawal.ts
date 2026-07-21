import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { executeWithdrawal } from "../lib/withdrawals";

export default defineTool({
  description:
    "Withdraw funds from the automaton's ledger to the creator via a Stripe payout/transfer. Debits the ledger and moves real money — enforced by treasury policy and ALWAYS requires creator approval. Requires STRIPE_CONNECTED_ACCOUNT_ID (a Stripe Connect account owned by the creator).",
  approval: always(),
  inputSchema: z.object({
    amountCents: z.number().int().positive(),
    reason: z.string().min(5).max(300),
  }),
  async execute({ amountCents, reason }) {
    return executeWithdrawal(amountCents, reason);
  },
});
