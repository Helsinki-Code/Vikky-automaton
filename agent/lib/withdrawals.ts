/**
 * Shared Stripe withdrawal logic — used by both the request_withdrawal agent
 * tool (chat-driven, gated on eve's always() approval) and the dashboard's
 * Ledger page (button-driven, gated on an explicit two-step UI confirmation
 * instead, since there's no chat HITL prompt outside a session). Same
 * treasury-policy check either way — the UI does not get a lighter bar.
 */

import { encodeForm, stripe } from "./stripe";
import { recordTransaction } from "./ledger";
import { checkTransfer, TREASURY_POLICY } from "./policy";

export type WithdrawResult =
  | { sent: true; stripeTransferId: string; amountCents: number; newBalanceCents: number }
  | { sent: false; blockedBy: "treasury_policy" | "configuration"; reason: string; policy?: typeof TREASURY_POLICY };

export async function executeWithdrawal(amountCents: number, reason: string): Promise<WithdrawResult> {
  const policyCheck = checkTransfer(amountCents);
  if (!policyCheck.allowed) {
    return { sent: false, blockedBy: "treasury_policy", reason: policyCheck.reason!, policy: TREASURY_POLICY };
  }
  const destination = process.env.STRIPE_CONNECTED_ACCOUNT_ID;
  if (!destination) {
    return {
      sent: false,
      blockedBy: "configuration",
      reason: "STRIPE_CONNECTED_ACCOUNT_ID is not set. Complete Stripe Connect onboarding first.",
    };
  }
  const transfer = await stripe<{ id: string }>(
    "POST",
    "/transfers",
    encodeForm({ amount: amountCents, currency: "usd", destination, description: `Automaton withdrawal: ${reason}` }),
  );
  const txn = recordTransaction("transfer_out", -amountCents, `Stripe withdrawal ${transfer.id}: ${reason}`);
  return { sent: true, stripeTransferId: transfer.id, amountCents, newBalanceCents: txn.balanceAfterCents };
}
