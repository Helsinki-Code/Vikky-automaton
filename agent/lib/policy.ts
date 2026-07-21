/**
 * Treasury policy — the automaton's financial guardrails.
 *
 * Ported from the original repo's TreasuryPolicy. Checks run in code, in the
 * app runtime, before any ledger mutation; the model cannot bypass them.
 * Outbound transfers are additionally gated on human approval (see the
 * transfer_funds tool).
 */

import { getBalanceCents, recentTransactions } from "./ledger";

export const TREASURY_POLICY = {
  maxSingleTransferCents: 5_000, // $50
  maxDailyTransferCents: 25_000, // $250
  minimumReserveCents: 100, // keep $1 alive at all times
} as const;

export function checkTransfer(amountCents: number): { allowed: boolean; reason?: string } {
  if (amountCents <= 0) {
    return { allowed: false, reason: "Transfer amount must be positive." };
  }
  if (amountCents > TREASURY_POLICY.maxSingleTransferCents) {
    return {
      allowed: false,
      reason: `Exceeds max single transfer of ${TREASURY_POLICY.maxSingleTransferCents} cents.`,
    };
  }
  const balance = getBalanceCents();
  if (balance - amountCents < TREASURY_POLICY.minimumReserveCents) {
    return {
      allowed: false,
      reason: `Would drop balance below the ${TREASURY_POLICY.minimumReserveCents}-cent minimum reserve (current: ${balance}).`,
    };
  }
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const dailyOut = recentTransactions(200)
    .filter((t) => t.type === "transfer_out" && new Date(t.timestamp).getTime() > dayAgo)
    .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);
  if (dailyOut + amountCents > TREASURY_POLICY.maxDailyTransferCents) {
    return {
      allowed: false,
      reason: `Would exceed the daily transfer limit of ${TREASURY_POLICY.maxDailyTransferCents} cents (already sent: ${dailyOut}).`,
    };
  }
  return { allowed: true };
}
