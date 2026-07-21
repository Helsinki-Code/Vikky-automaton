import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";

export default defineTool({
  description: "Push the sandbox workspace's current branch to its configured remote. Requires approval — pushing is externally visible.",
  approval: once(),
  inputSchema: z.object({
    path: z.string().default("/workspace"),
    remote: z.string().default("origin"),
    branch: z.string().optional().describe("Defaults to the current branch"),
  }),
  async execute({ path, remote, branch }, ctx) {
    const sandbox = await ctx.getSandbox();
    const target = branch || (await sandbox.run({ command: `git -C ${path} branch --show-current` })).stdout.trim();
    const result = await sandbox.run({ command: `git -C ${path} push ${remote} ${target}` });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
  },
});
