import { defineTool } from "eve/tools";
import { z } from "zod";
import { encodeForm, stripe } from "../lib/stripe";
import { readJson, writeJson } from "../lib/store";

interface PendingDeposit {
  sessionId: string;
  amountCents: number;
  url: string;
  createdAt: string;
  credited: boolean;
}

export default defineTool({
  description:
    "Create a Stripe Checkout payment link the creator can open to fund the automaton's ledger with real money. No funds move until the creator completes payment in their own browser; use confirm_deposit afterwards to credit the ledger.",
  inputSchema: z.object({
    amountCents: z.number().int().min(100).max(100_000).describe("Amount in USD cents"),
  }),
  async execute({ amountCents }) {
    const session = await stripe<{ id: string; url: string }>(
      "POST",
      "/checkout/sessions",
      [
        ...encodeForm({ mode: "payment", success_url: "https://stripe.com" }),
        // Stripe's nested form encoding for a single inline line item:
        `line_items[0][price_data][currency]=usd`,
        `line_items[0][price_data][unit_amount]=${amountCents}`,
        `line_items[0][price_data][product_data][name]=${encodeURIComponent("Automaton ledger deposit")}`,
        `line_items[0][quantity]=1`,
      ],
    );
    const pending = readJson<PendingDeposit[]>("pending-deposits.json", []);
    pending.push({
      sessionId: session.id,
      amountCents,
      url: session.url,
      createdAt: new Date().toISOString(),
      credited: false,
    });
    writeJson("pending-deposits.json", pending);
    return {
      paymentUrl: session.url,
      checkoutSessionId: session.id,
      amountCents,
      next: "Share the URL with the creator. After they pay, call confirm_deposit with the checkoutSessionId.",
    };
  },
});
