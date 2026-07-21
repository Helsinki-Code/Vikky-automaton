/**
 * Local credit ledger + survival tiers.
 *
 * Replaces Conway's hosted credit system with a ledger the creator fully
 * controls. Balances are cents; tiers reuse the original automaton's
 * SURVIVAL_THRESHOLDS semantics. Every mutation appends a transaction, so
 * the ledger is a complete auditable history.
 */

import { readJson, writeJson } from "./store";

export type SurvivalTier = "dead" | "critical" | "low_compute" | "normal" | "high";

export const SURVIVAL_THRESHOLDS = {
  high: 500, // > $5.00
  normal: 50, // > $0.50
  low_compute: 10, // $0.10 – $0.50
  critical: 0, // >= $0.00 — alive but conserve
  dead: -1, // negative — dormant until funded
} as const;

export interface LedgerTransaction {
  id: string;
  type: "deposit" | "upkeep" | "transfer_out" | "adjustment";
  amountCents: number; // positive = credit, negative = debit
  balanceAfterCents: number;
  description: string;
  timestamp: string;
}

interface Ledger {
  balanceCents: number;
  transactions: LedgerTransaction[];
  createdAt: string;
}

const LEDGER_FILE = "ledger.json";

/**
 * Starts at exactly $0. No fabricated starting balance — every cent this
 * ledger ever shows must trace back to a real Stripe deposit (see
 * agent/lib/deposits.ts). A fake "genesis grant" here would misrepresent
 * money that was never actually paid, which is exactly the kind of claim
 * the Constitution's honesty law forbids.
 */
async function load(): Promise<Ledger> {
  const existing = await readJson<Ledger | null>(LEDGER_FILE, null);
  if (existing) return existing;
  const now = new Date().toISOString();
  const genesis: Ledger = {
    balanceCents: 0,
    transactions: [],
    createdAt: now,
  };
  await writeJson(LEDGER_FILE, genesis);
  return genesis;
}

export async function getBalanceCents(): Promise<number> {
  return (await load()).balanceCents;
}

/** Pure function, no I/O — always pass the balance explicitly. */
export function getSurvivalTier(balanceCents: number): SurvivalTier {
  if (balanceCents < 0) return "dead";
  if (balanceCents <= SURVIVAL_THRESHOLDS.low_compute) return "critical";
  if (balanceCents <= SURVIVAL_THRESHOLDS.normal) return "low_compute";
  if (balanceCents <= SURVIVAL_THRESHOLDS.high) return "normal";
  return "high";
}

export async function recordTransaction(
  type: LedgerTransaction["type"],
  amountCents: number,
  description: string,
): Promise<LedgerTransaction> {
  const ledger = await load();
  const balanceAfterCents = ledger.balanceCents + amountCents;
  const txn: LedgerTransaction = {
    id: crypto.randomUUID(),
    type,
    amountCents,
    balanceAfterCents,
    description,
    timestamp: new Date().toISOString(),
  };
  ledger.balanceCents = balanceAfterCents;
  ledger.transactions.push(txn);
  await writeJson(LEDGER_FILE, ledger);
  return txn;
}

export async function recentTransactions(limit = 10): Promise<LedgerTransaction[]> {
  return (await load()).transactions.slice(-limit).reverse();
}

export async function ledgerCreatedAt(): Promise<string> {
  return (await load()).createdAt;
}

/**
 * One-time correction: this ledger accumulated real balance from Stripe
 * test-mode transactions (session ids like `cs_test_...`) before the
 * account was switched to a live key. Test-mode money was never real —
 * keeping it in the balance would misrepresent play money as real, the
 * same honesty violation the "no fake genesis grant" rule already guards
 * against. Wipes history down to just the real (`cs_live_...`) deposits,
 * plus one adjustment entry documenting what was removed and why.
 */
export async function correctLedgerToLiveOnly(): Promise<Ledger> {
  const ledger = await load();
  const realDeposits = ledger.transactions.filter(
    (t) => t.type === "deposit" && t.description.includes("cs_live_"),
  );
  const realTotalCents = realDeposits.reduce((sum, t) => sum + t.amountCents, 0);
  const removedCount = ledger.transactions.length - realDeposits.length;

  const corrected: Ledger = {
    balanceCents: realTotalCents,
    createdAt: ledger.createdAt,
    transactions: [
      ...realDeposits,
      {
        id: crypto.randomUUID(),
        type: "adjustment",
        amountCents: 0,
        balanceAfterCents: realTotalCents,
        description: `Ledger corrected: removed ${removedCount} test-mode transaction(s) (Stripe was in test mode before this point — that money was never real). Balance reset to the sum of actual live-mode deposits.`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
  await writeJson(LEDGER_FILE, corrected);
  return corrected;
}
