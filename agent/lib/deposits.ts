/**
 * Shared Stripe deposit logic — used by both the create_deposit_link /
 * confirm_deposit agent tools (chat-driven) and the dashboard's Ledger page
 * (button-driven). One implementation so the two paths can't drift.
 */

import { encodeForm, stripe } from "./stripe";
import { readJson, writeJson } from "./store";
import { recordTransaction, getSurvivalTier } from "./ledger";

export interface PendingDeposit {
  sessionId: string;
  amountCents: number;
  url: string;
  createdAt: string;
  credited: boolean;
}

const PENDING_FILE = "pending-deposits.json";

export async function createDepositSession(
  amountCents: number,
  returnUrls: { successUrl: string; cancelUrl: string },
): Promise<{ paymentUrl: string; checkoutSessionId: string }> {
  const session = await stripe<{ id: string; url: string }>("POST", "/checkout/sessions", [
    ...encodeForm({ mode: "payment", success_url: returnUrls.successUrl, cancel_url: returnUrls.cancelUrl }),
    `line_items[0][price_data][currency]=usd`,
    `line_items[0][price_data][unit_amount]=${amountCents}`,
    `line_items[0][price_data][product_data][name]=${encodeURIComponent("Automaton ledger deposit")}`,
    `line_items[0][quantity]=1`,
  ]);
  const pending = readJson<PendingDeposit[]>(PENDING_FILE, []);
  pending.push({
    sessionId: session.id,
    amountCents,
    url: session.url,
    createdAt: new Date().toISOString(),
    credited: false,
  });
  writeJson(PENDING_FILE, pending);
  return { paymentUrl: session.url, checkoutSessionId: session.id };
}

export type ConfirmDepositResult =
  | { credited: true; amountCents: number; newBalanceCents: number; survivalTier: ReturnType<typeof getSurvivalTier> }
  | { credited: false; reason: string };

export async function confirmDepositSession(checkoutSessionId: string): Promise<ConfirmDepositResult> {
  const pending = readJson<PendingDeposit[]>(PENDING_FILE, []);
  const record = pending.find((p) => p.sessionId === checkoutSessionId);
  if (!record) {
    return { credited: false, reason: "Unknown checkout session." };
  }
  if (record.credited) {
    return { credited: false, reason: "This deposit was already credited." };
  }
  // Truth comes from Stripe, not the local record.
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
  writeJson(PENDING_FILE, pending);
  return {
    credited: true,
    amountCents,
    newBalanceCents: txn.balanceAfterCents,
    survivalTier: getSurvivalTier(txn.balanceAfterCents),
  };
}
