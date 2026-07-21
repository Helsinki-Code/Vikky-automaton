import { defineTool } from "eve/tools";
import { z } from "zod";
import { confirmDepositSession } from "../lib/deposits";

export default defineTool({
  description:
    "Verify a Stripe Checkout session created by create_deposit_link and, if it was actually paid, credit the ledger. Idempotent: an already-credited session is never credited twice.",
  inputSchema: z.object({
    checkoutSessionId: z.string().min(1),
  }),
  async execute({ checkoutSessionId }) {
    return confirmDepositSession(checkoutSessionId);
  },
});
