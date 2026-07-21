import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Show git status of the sandbox workspace (or a given repo path).",
  inputSchema: z.object({ path: z.string().default("/workspace") }),
  async execute({ path }, ctx) {
    const sandbox = await ctx.getSandbox();
    const result = await sandbox.run({ command: `git -C ${path} status --short --branch` });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
  },
});
