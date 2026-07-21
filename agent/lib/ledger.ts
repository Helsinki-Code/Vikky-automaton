/**
 * Local credit ledger + survival tiers.
 *
 * Replaces Conway's hosted credit system with a ledger the creator fully
 * controls. Balances are cents; tiers reuse the original automaton's
 * SURVIVAL_THRESHOLDS semantics. Every mutation appends a transaction, so
 * `.automaton/ledger.json` is a complete auditable history.
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
function load(): Ledger {
  const existing = readJson<Ledger | null>(LEDGER_FILE, null);
  if (existing) return existing;
  const now = new Date().toISOString();
  const genesis: Ledger = {
    balanceCents: 0,
    transactions: [],
    createdAt: now,
  };
  writeJson(LEDGER_FILE, genesis);
  return genesis;
}

export function getBalanceCents(): number {
  return load().balanceCents;
}

export function getSurvivalTier(balanceCents = getBalanceCents()): SurvivalTier {
  if (balanceCents < 0) return "dead";
  if (balanceCents <= SURVIVAL_THRESHOLDS.low_compute) return "critical";
  if (balanceCents <= SURVIVAL_THRESHOLDS.normal) return "low_compute";
  if (balanceCents <= SURVIVAL_THRESHOLDS.high) return "normal";
  return "high";
}

export function recordTransaction(
  type: LedgerTransaction["type"],
  amountCents: number,
  description: string,
): LedgerTransaction {
  const ledger = load();
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
  writeJson(LEDGER_FILE, ledger);
  return txn;
}

export function recentTransactions(limit = 10): LedgerTransaction[] {
  return load().transactions.slice(-limit).reverse();
}

export function ledgerCreatedAt(): string {
  return load().createdAt;
}
