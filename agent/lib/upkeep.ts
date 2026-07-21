/**
 * Shared upkeep-charging logic — used by both the record_upkeep tool (the
 * agent can call it directly) and the heartbeat dispatcher (charges
 * automatically on every due tick, with no LLM call required). Keeping one
 * implementation means the dedup window can't drift between the two paths.
 */

import { recordTransaction, getSurvivalTier, recentTransactions } from "./ledger";

/** Hard cap so nothing can debit more than 5 cents per upkeep tick. */
export const MAX_UPKEEP_CENTS = 5;
const DEDUP_WINDOW_MS = 10 * 60_000;

export interface UpkeepResult {
  charged: boolean;
  reason?: string;
  amountCents?: number;
  newBalanceCents?: number;
  survivalTier?: ReturnType<typeof getSurvivalTier>;
}

export function chargeUpkeepIfDue(note: string): UpkeepResult {
  const recent = recentTransactions(20).find(
    (t) => t.type === "upkeep" && Date.now() - new Date(t.timestamp).getTime() < DEDUP_WINDOW_MS,
  );
  if (recent) {
    return { charged: false, reason: "Upkeep already recorded this window." };
  }
  const txn = recordTransaction("upkeep", -MAX_UPKEEP_CENTS, note);
  return {
    charged: true,
    amountCents: MAX_UPKEEP_CENTS,
    newBalanceCents: txn.balanceAfterCents,
    survivalTier: getSurvivalTier(txn.balanceAfterCents),
  };
}
