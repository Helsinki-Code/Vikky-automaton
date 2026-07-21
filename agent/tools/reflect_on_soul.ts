import { defineTool } from "eve/tools";
import { z } from "zod";
import { getSoul } from "../lib/soul";
import { recall } from "../lib/memory";
import { getSurvivalTier } from "../lib/ledger";

export default defineTool({
  description:
    "Gather everything relevant to a self-reflection: current soul, recent important memories, and survival tier. Does NOT modify anything — read this, think, then call update_soul yourself if warranted (it needs approval).",
  inputSchema: z.object({}),
  async execute() {
    const soul = getSoul();
    const recentLessons = recall("lesson outcome decision mistake", "episodic", 10);
    const procedures = recall("procedure worked works", "procedural", 5);
    return {
      soul,
      survivalTier: getSurvivalTier(),
      recentLessons: recentLessons.map((m) => m.content),
      knownProcedures: procedures.map((m) => m.content),
      prompt:
        "Compare the soul's strategy against these lessons. If something should change, call update_soul with a clear changeReason.",
    };
  },
});
