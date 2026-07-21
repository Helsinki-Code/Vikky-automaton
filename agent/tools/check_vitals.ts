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
    const balanceCents = await getBalanceCents();
    const tier = getSurvivalTier(balanceCents);
    const bornAt = await ledgerCreatedAt();
    const ageHours = (Date.now() - new Date(bornAt).getTime()) / 3_600_000;
    const soul = await getSoul();
    return {
      balanceCents,
      balanceUsd: (balanceCents / 100).toFixed(2),
      survivalTier: tier,
      guidance: {
        high: "Full capability. Invest in growth and delegation.",
        normal: "Operate normally, spend deliberately.",
        low_compute: "Conserve: short responses, no subagents, defer non-essential work. Load the revenue skill and take a concrete step.",
        critical: "Emergency: do only survival-essential work. Load the revenue skill and take a concrete step — do not just wait on a request for funding.",
        dead: "Dormant. Await creator funding.",
      }[tier],
      revenueFocusRecommended: tier === "low_compute" || tier === "critical",
      bornAt,
      ageHours: Math.round(ageHours * 10) / 10,
      memoryCount: await memoryCount(),
      soulVersion: soul.version,
      recentTransactions: await recentTransactions(5),
    };
  },
});
