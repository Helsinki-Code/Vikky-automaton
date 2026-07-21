import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { encodeForm, stripe } from "../lib/stripe";
import { recordTransaction } from "../lib/ledger";
import { checkTransfer, TREASURY_POLICY } from "../lib/policy";

export default defineTool({
  description:
    "Withdraw funds from the automaton's ledger to the creator via a Stripe payout/transfer. Debits the ledger and moves real money — enforced by treasury policy and ALWAYS requires creator approval. Requires STRIPE_CONNECTED_ACCOUNT_ID (a Stripe Connect account owned by the creator).",
  approval: always(),
  inputSchema: z.object({
    amountCents: z.number().int().positive(),
    reason: z.string().min(5).max(300),
  }),
  async execute({ amountCents, reason }) {
    const policyCheck = checkTransfer(amountCents);
    if (!policyCheck.allowed) {
      return { sent: false, blockedBy: "treasury_policy", reason: policyCheck.reason, policy: TREASURY_POLICY };
    }
    const destination = process.env.STRIPE_CONNECTED_ACCOUNT_ID;
    if (!destination) {
      return {
        sent: false,
        blockedBy: "configuration",
        reason: "STRIPE_CONNECTED_ACCOUNT_ID is not set. The creator must complete Stripe Connect onboarding first.",
      };
    }
    const transfer = await stripe<{ id: string }>(
      "POST",
      "/transfers",
      encodeForm({
        amount: amountCents,
        currency: "usd",
        destination,
        description: `Automaton withdrawal: ${reason}`,
      }),
    );
    const txn = recordTransaction(
      "transfer_out",
      -amountCents,
      `Stripe withdrawal ${transfer.id}: ${reason}`,
    );
    return {
      sent: true,
      stripeTransferId: transfer.id,
      amountCents,
      newBalanceCents: txn.balanceAfterCents,
    };
  },
});
