/**
 * Per-service Stripe revenue, attributed to a specific deployed service (see
 * agent/lib/services.ts) instead of only appearing as a generic ledger
 * transaction description. Mirrors onchain-income.ts's separation pattern:
 * this is a breakdown view alongside the real ledger entry
 * (agent/lib/ledger.ts still records the actual balance-affecting
 * transaction — this file never duplicates or replaces that, only annotates
 * which service earned it).
 */

import { readJson, writeJson } from "./store";

export interface ServiceRevenueEntry {
  id: string;
  serviceId: string;
  serviceName: string;
  amountCents: number;
  stripeSessionId: string;
  timestamp: string;
}

const FILE = "service-revenue.json";

export async function recordServiceRevenue(
  serviceId: string,
  serviceName: string,
  amountCents: number,
  stripeSessionId: string,
): Promise<ServiceRevenueEntry> {
  const entries = await readJson<ServiceRevenueEntry[]>(FILE, []);
  const entry: ServiceRevenueEntry = {
    id: crypto.randomUUID(),
    serviceId,
    serviceName,
    amountCents,
    stripeSessionId,
    timestamp: new Date().toISOString(),
  };
  entries.push(entry);
  await writeJson(FILE, entries.slice(-2000));
  return entry;
}

export async function revenueByService(): Promise<Record<string, { serviceName: string; totalCents: number; count: number }>> {
  const entries = await readJson<ServiceRevenueEntry[]>(FILE, []);
  const byService: Record<string, { serviceName: string; totalCents: number; count: number }> = {};
  for (const e of entries) {
    if (!byService[e.serviceId]) byService[e.serviceId] = { serviceName: e.serviceName, totalCents: 0, count: 0 };
    byService[e.serviceId].totalCents += e.amountCents;
    byService[e.serviceId].count += 1;
  }
  return byService;
}

export async function recentServiceRevenue(limit = 20): Promise<ServiceRevenueEntry[]> {
  return (await readJson<ServiceRevenueEntry[]>(FILE, [])).slice(-limit).reverse();
}
