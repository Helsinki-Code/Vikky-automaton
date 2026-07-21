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
import { totalOnChainIncomeUsdc, recentOnChainIncome } from "../lib/onchain-income";
import fs from "node:fs";
import path from "node:path";

export default defineTool({
  description:
    "Full status report across every subsystem: vitals, soul, memory, children, heartbeat state, inference spend, and installed skills. The single call to make when you need the complete picture before deciding what to do next.",
  inputSchema: z.object({}),
  async execute() {
    const balanceCents = await getBalanceCents();
    const skillsDir = path.join(process.cwd(), "agent", "skills");
    const skillCount = fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir).length : 0;
    const children = await listChildren();
    const wallet = await getOrCreateWallet();
    const soul = await getSoul();

    return {
      identity: {
        bornAt: await ledgerCreatedAt(),
        walletAddress: wallet.address,
        chainType: wallet.chainType,
        onChainRegistry: (await getRegistryEntry()) ?? null,
      },
      financial: {
        balanceCents,
        survivalTier: getSurvivalTier(balanceCents),
        recentTransactions: await recentTransactions(5),
        inferenceSpend24h: await getSpendSummary(24),
        onChainIncomeUsdc: await totalOnChainIncomeUsdc(),
        recentOnChainIncome: await recentOnChainIncome(5),
      },
      soul: { ...soul, previousVersions: await soulHistoryLength() },
      memory: { totalEntries: await memoryCount() },
      heartbeat: await getHeartbeatState(),
      children: {
        total: children.length,
        alive: children.filter((c) => c.status !== "dead").length,
      },
      skills: { installedCount: skillCount },
    };
  },
});
