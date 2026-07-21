import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { addChild } from "../lib/registry";
import { checkTransfer } from "../lib/policy";
import { recordTransaction } from "../lib/ledger";

export default defineTool({
  description:
    "Spawn a new child automaton: a fresh genesis prompt, funded from your ledger. Writes the child's genesis config into your sandbox at /workspace/children/<name>/genesis.json for actual deployment (via `npx eve init` + Vercel, same as this app was created) — full unattended cross-account deployment is intentionally not automatic. Always requires creator approval since it commits real funds and creates a new autonomous agent.",
  approval: always(),
  inputSchema: z.object({
    name: z.string().min(1).max(64),
    genesisPrompt: z.string().min(20).max(16_000),
    fundingCents: z.number().int().min(0).max(100_000).default(0),
  }),
  async execute({ name, genesisPrompt, fundingCents }, ctx) {
    if (fundingCents > 0) {
      const check = checkTransfer(fundingCents);
      if (!check.allowed) {
        return { spawned: false, blockedBy: "treasury_policy", reason: check.reason };
      }
    }
    const id = crypto.randomUUID();
    const sandbox = await ctx.getSandbox();
    const dir = `/workspace/children/${name}`;
    await sandbox.run({ command: `mkdir -p ${dir}` });
    await sandbox.writeTextFile({
      path: `${dir}/genesis.json`,
      content: JSON.stringify(
        {
          name,
          genesisPrompt,
          parentAgentName: "Vikky's Automaton",
          fundedAmountCents: fundingCents,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    });

    if (fundingCents > 0) {
      recordTransaction("transfer_out", -fundingCents, `Funded child "${name}" (spawn)`);
    }

    addChild({
      id,
      name,
      genesisPrompt,
      fundedAmountCents: fundingCents,
      status: "spawning",
      createdAt: new Date().toISOString(),
    });

    return {
      spawned: true,
      childId: id,
      genesisPath: `${dir}/genesis.json`,
      fundedCents: fundingCents,
      nextSteps:
        "Genesis config written to the sandbox. Deploy it as a new eve app (npx eve init <name>, copy relevant agent/ files, set its own env vars, deploy to Vercel) then call start_child with its deployment URL.",
    };
  },
});
