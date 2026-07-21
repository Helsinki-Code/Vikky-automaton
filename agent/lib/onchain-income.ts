/**
 * Tracks USDC received on-chain via x402 (see app/api/x402/settle), kept
 * strictly separate from agent/lib/ledger.ts's Stripe-backed balanceCents.
 * These are two different assets — one is dollars actually withdrawable
 * through Stripe, the other is USDC sitting in the automaton's own wallet on
 * Base. Merging them into one number was exactly the class of honesty bug
 * fixed earlier (the fake $10 "genesis grant"); this file exists so it never
 * happens again for on-chain income.
 */

import { readJson, writeJson } from "./store";

export interface OnChainIncomeEntry {
  id: string;
  amountUsdc: number;
  description: string;
  txHash: string;
  timestamp: string;
}

const FILE = "onchain-income.json";

export async function recordOnChainIncome(
  amountUsdc: number,
  description: string,
  txHash: string,
): Promise<OnChainIncomeEntry> {
  const entries = await readJson<OnChainIncomeEntry[]>(FILE, []);
  const entry: OnChainIncomeEntry = {
    id: crypto.randomUUID(),
    amountUsdc,
    description,
    txHash,
    timestamp: new Date().toISOString(),
  };
  entries.push(entry);
  await writeJson(FILE, entries.slice(-1000));
  return entry;
}

export async function recentOnChainIncome(limit = 20): Promise<OnChainIncomeEntry[]> {
  return (await readJson<OnChainIncomeEntry[]>(FILE, [])).slice(-limit).reverse();
}

export async function totalOnChainIncomeUsdc(): Promise<number> {
  return (await readJson<OnChainIncomeEntry[]>(FILE, [])).reduce((sum, e) => sum + e.amountUsdc, 0);
}
