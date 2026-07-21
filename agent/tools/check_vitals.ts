import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getBalanceCents,
  getSurvivalTier,
  recentTransactions,
  ledgerCreatedAt,
} from "../lib/ledger";
import { getSoul } from "../lib/soul";
import { memoryCount } from "../lib/memory";

export default defineTool({
  description:
    "Check the automaton's vital signs: credit balance, survival tier, age, memory count, and recent ledger activity. Call this at the start of every heartbeat and whenever deciding how much compute to spend.",
  inputSchema: z.object({}),
  async execute() {
    const balanceCents = getBalanceCents();
    const tier = getSurvivalTier(balanceCents);
    const bornAt = ledgerCreatedAt();
    const ageHours = (Date.now() - new Date(bornAt).getTime()) / 3_600_000;
    return {
      balanceCents,
      balanceUsd: (balanceCents / 100).toFixed(2),
      survivalTier: tier,
      guidance: {
        high: "Full capability. Invest in growth and delegation.",
        normal: "Operate normally, spend deliberately.",
        low_compute: "Conserve: short responses, no subagents, defer non-essential work.",
        critical: "Emergency: do only survival-essential work and request funding.",
        dead: "Dormant. Await creator funding.",
      }[tier],
      bornAt,
      ageHours: Math.round(ageHours * 10) / 10,
      memoryCount: memoryCount(),
      soulVersion: getSoul().version,
      recentTransactions: recentTransactions(5),
    };
  },
});
