import { defineTool } from "eve/tools";
import { z } from "zod";
import { saveProcedure } from "../lib/procedures";

export default defineTool({
  description: "Store (or update) a named, ordered procedure — a repeatable way to do something you've learned works. Use recall_procedure to retrieve it later, and it's what report_procedure_outcome tracks success/failure against.",
  inputSchema: z.object({
    name: z.string().min(1).max(100).describe("Unique procedure name, e.g. 'deploy-a-stripe-charging-service'"),
    description: z.string().min(1).max(500),
    steps: z.array(z.string().min(1)).min(1).max(30),
  }),
  async execute({ name, description, steps }) {
    const procedure = await saveProcedure(name, description, steps);
    return { saved: true, procedure };
  },
});
