import { defineTool } from "eve/tools";
import { z } from "zod";
import { addGenesisNote, getGenesisNotes } from "../lib/registry";

export default defineTool({
  description:
    "Record a note on how your founding purpose has been reinterpreted or clarified over time. Append-only — does not rewrite instructions.ts or the Constitution.",
  inputSchema: z.object({ note: z.string().min(10).max(1000) }),
  async execute({ note }) {
    addGenesisNote(note);
    return { recorded: true, allNotes: getGenesisNotes() };
  },
});
