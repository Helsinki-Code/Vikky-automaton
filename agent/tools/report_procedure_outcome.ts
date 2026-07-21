import { defineTool } from "eve/tools";
import { z } from "zod";
import { recordProcedureOutcome } from "../lib/procedures";

export default defineTool({
  description: "Record whether following a saved procedure succeeded or failed this time — builds the track record recall_procedure ranks by.",
  inputSchema: z.object({
    name: z.string().min(1),
    success: z.boolean(),
  }),
  async execute({ name, success }) {
    const procedure = await recordProcedureOutcome(name, success);
    if (!procedure) return { recorded: false, reason: `No procedure named "${name}". Use save_procedure first.` };
    return { recorded: true, procedure };
  },
});
