import { defineTool } from "eve/tools";
import { z } from "zod";
import { stripe } from "../lib/stripe";
import { readJson, writeJson } from "../lib/store";
import { recordTransaction, getSurvivalTier } from "../lib/ledger";

interface PendingDeposit {
  sessionId: string;
  amountCents: number;
  url: string;
  createdAt: string;
  credited: boolean;
}

export default defineTool({
  description:
    "Verify a Stripe Checkout session created by create_deposit_link and, if it was actually paid, credit the ledger. Idempotent: an already-credited session is never credited twice.",
  inputSchema: z.object({
    checkoutSessionId: z.string().min(1),
  }),
  async execute({ checkoutSessionId }) {
    const pending = readJson<PendingDeposit[]>("pending-deposits.json", []);
    const record = pending.find((p) => p.sessionId === checkoutSessionId);
    if (!record) {
      return { credited: false, reason: "Unknown checkout session — was it created by create_deposit_link?" };
    }
    if (record.credited) {
      return { credited: false, reason: "This deposit was already credited." };
    }
    // Truth comes from Stripe, not from the model or the local record.
    const session = await stripe<{ payment_status: string; amount_total: number }>(
      "GET",
      `/checkout/sessions/${encodeURIComponent(checkoutSessionId)}`,
    );
    if (session.payment_status !== "paid") {
      return { credited: false, reason: `Payment status is "${session.payment_status}" — not paid yet.` };
    }
    const amountCents = session.amount_total;
    const txn = recordTransaction("deposit", amountCents, `Stripe deposit ${checkoutSessionId}`);
    record.credited = true;
    writeJson("pending-deposits.json", pending);
    return {
      credited: true,
      amountCents,
      newBalanceCents: txn.balanceAfterCents,
      survivalTier: getSurvivalTier(txn.balanceAfterCents),
    };
  },
});
