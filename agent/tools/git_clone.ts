import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Clone a git repository into the sandbox workspace.",
  inputSchema: z.object({
    url: z.string().url(),
    destination: z.string().default("").describe("Relative path under /workspace; empty = derive from repo name"),
  }),
  async execute({ url, destination }, ctx) {
    const sandbox = await ctx.getSandbox();
    const dest = destination ? `/workspace/${destination}` : "";
    const result = await sandbox.run({ command: `git clone ${url} ${dest}`.trim() });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
  },
});
