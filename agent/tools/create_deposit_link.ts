import { defineTool } from "eve/tools";
import { z } from "zod";
import { createDepositSession } from "../lib/deposits";

export default defineTool({
  description:
    "Create a Stripe Checkout payment link the creator can open to fund the automaton's ledger with real money. No funds move until the creator completes payment in their own browser; use confirm_deposit afterwards to credit the ledger. Prefer telling the creator to use the Ledger page's 'Add funds' button in the dashboard instead when they're already there — this tool is for when they're only reachable via chat/Telegram.",
  inputSchema: z.object({
    amountCents: z.number().int().min(100).max(100_000).describe("Amount in USD cents"),
  }),
  async execute({ amountCents }) {
    const { paymentUrl, checkoutSessionId } = await createDepositSession(amountCents, {
      successUrl: "https://stripe.com",
      cancelUrl: "https://stripe.com",
    });
    return {
      paymentUrl,
      checkoutSessionId,
      amountCents,
      next: "Share the URL with the creator. After they pay, call confirm_deposit with the checkoutSessionId.",
    };
  },
});
