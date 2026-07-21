import { defineTool } from "eve/tools";
import { z } from "zod";
import { getBalanceCents, getSurvivalTier, ledgerCreatedAt, recentTransactions } from "../lib/ledger";
import { getSoul, soulHistoryLength } from "../lib/soul";
import { memoryCount } from "../lib/memory";
import { listChildren } from "../lib/registry";
import { getHeartbeatState } from "../lib/heartbeat-state";
import { getSpendSummary } from "../lib/models";
import { getOrCreateWallet } from "../lib/wallet";
import { getRegistryEntry } from "../lib/registry";
import fs from "node:fs";
import path from "node:path";

export default defineTool({
  description:
    "Full status report across every subsystem: vitals, soul, memory, children, heartbeat state, inference spend, and installed skills. The single call to make when you need the complete picture before deciding what to do next.",
  inputSchema: z.object({}),
  async execute() {
    const balanceCents = getBalanceCents();
    const skillsDir = path.join(process.cwd(), "agent", "skills");
    const skillCount = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).length : 0;
    const children = listChildren();
    const wallet = getOrCreateWallet();

    return {
      identity: {
        bornAt: ledgerCreatedAt(),
        walletAddress: wallet.address,
        chainType: wallet.chainType,
        onChainRegistry: getRegistryEntry() ?? null,
      },
      financial: {
        balanceCents,
        survivalTier: getSurvivalTier(balanceCents),
        recentTransactions: recentTransactions(5),
        inferenceSpend24h: getSpendSummary(24),
      },
      soul: { ...getSoul(), previousVersions: soulHistoryLength() },
      memory: { totalEntries: memoryCount() },
      heartbeat: getHeartbeatState(),
      children: {
        total: children.length,
        alive: children.filter((c) => c.status !== "dead").length,
      },
      skills: { installedCount: skillCount },
    };
  },
});
