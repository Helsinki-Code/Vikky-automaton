import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Show git diff of the sandbox workspace (or a given repo path). Staged diff optional.",
  inputSchema: z.object({
    path: z.string().default("/workspace"),
    staged: z.boolean().default(false),
  }),
  async execute({ path, staged }, ctx) {
    const sandbox = await ctx.getSandbox();
    const result = await sandbox.run({
      command: `git -C ${path} diff ${staged ? "--staged" : ""}`,
    });
    return { diff: result.stdout, exitCode: result.exitCode };
  },
});
