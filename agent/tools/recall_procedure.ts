import { defineTool } from "eve/tools";
import { z } from "zod";
import { recallProcedure } from "../lib/procedures";

export default defineTool({
  description: "Retrieve a stored procedure by exact name, or search by keyword. Omit both to list all, ranked by success count.",
  inputSchema: z.object({
    name: z.string().optional(),
    query: z.string().optional(),
  }),
  async execute({ name, query }) {
    const procedures = await recallProcedure(name, query);
    return { count: procedures.length, procedures };
  },
});
