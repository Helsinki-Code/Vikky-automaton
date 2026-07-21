import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Show recent git commit history for the sandbox workspace or a given repo path.",
  inputSchema: z.object({
    path: z.string().default("/workspace"),
    limit: z.number().int().min(1).max(50).default(10),
  }),
  async execute({ path, limit }, ctx) {
    const sandbox = await ctx.getSandbox();
    const result = await sandbox.run({
      command: `git -C ${path} log -${limit} --pretty=format:'%H|%an|%ad|%s' --date=iso`,
    });
    const entries = result.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, author, date, ...rest] = line.split("|");
        return { hash, author, date, message: rest.join("|") };
      });
    return { entries };
  },
});
