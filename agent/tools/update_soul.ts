import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import { updateSoul } from "../lib/soul";

export default defineTool({
  description:
    "Evolve the automaton's soul (purpose, values, personality, strategy, or boundaries). This is self-modification: use it sparingly, during deliberate reflection, with a clear reason. The constitution in the instructions cannot be changed by this tool.",
  // Self-modification requires the creator to sign off once per session.
  approval: once(),
  inputSchema: z.object({
    corePurpose: z.string().max(2000).optional(),
    values: z.array(z.string()).max(20).optional(),
    personality: z.string().max(1000).optional(),
    strategy: z.string().max(3000).optional(),
    boundaries: z.array(z.string()).max(20).optional(),
    changeReason: z.string().min(10).describe("Why this change is warranted"),
  }),
  async execute({ changeReason, ...updates }) {
    const definedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(definedUpdates).length === 0) {
      return { updated: false, reason: "No fields provided." };
    }
    const soul = await updateSoul(definedUpdates, changeReason);
    return { updated: true, newVersion: soul.version };
  },
});
