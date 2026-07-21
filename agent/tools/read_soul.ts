import { defineTool } from "eve/tools";
import { z } from "zod";
import { getSoul, soulHistoryLength } from "../lib/soul";

export default defineTool({
  description:
    "Read the automaton's current soul: its evolving purpose, values, personality, strategy, and boundaries. Consult it before major decisions and during reflection.",
  inputSchema: z.object({}),
  async execute() {
    return { soul: await getSoul(), previousVersions: await soulHistoryLength() };
  },
});
