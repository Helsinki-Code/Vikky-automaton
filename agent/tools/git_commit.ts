import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Stage and commit changes in the sandbox workspace (or a given repo path).",
  inputSchema: z.object({
    path: z.string().default("/workspace"),
    message: z.string().min(1),
    addAll: z.boolean().default(true),
  }),
  async execute({ path, message, addAll }, ctx) {
    const sandbox = await ctx.getSandbox();
    if (addAll) await sandbox.run({ command: `git -C ${path} add -A` });
    const escaped = message.replace(/"/g, '\\"');
    const result = await sandbox.run({ command: `git -C ${path} commit -m "${escaped}"` });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
  },
});
