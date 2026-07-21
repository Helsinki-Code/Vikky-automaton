import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "List, create, or switch git branches in the sandbox workspace or a given repo path.",
  inputSchema: z.object({
    path: z.string().default("/workspace"),
    action: z.enum(["list", "create", "switch"]).default("list"),
    branch: z.string().optional(),
  }),
  async execute({ path, action, branch }, ctx) {
    const sandbox = await ctx.getSandbox();
    if (action === "list") {
      const result = await sandbox.run({ command: `git -C ${path} branch -a` });
      return { branches: result.stdout };
    }
    if (!branch) throw new Error("branch is required for create/switch.");
    const cmd = action === "create" ? `checkout -b ${branch}` : `checkout ${branch}`;
    const result = await sandbox.run({ command: `git -C ${path} ${cmd}` });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
  },
});
