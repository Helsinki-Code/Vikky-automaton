import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import { execSync } from "node:child_process";

export default defineTool({
  description:
    "Pull and merge upstream changes (from origin) into the current branch. Review with review_upstream_changes first.",
  approval: once(),
  inputSchema: z.object({
    remote: z.string().default("origin"),
    branch: z.string().default("main"),
  }),
  async execute({ remote, branch }) {
    try {
      const output = execSync(`git pull ${remote} ${branch}`, { cwd: process.cwd() }).toString();
      return { pulled: true, output };
    } catch (err: any) {
      return { pulled: false, error: err.message, note: "Likely a merge conflict — resolve manually before retrying." };
    }
  },
});
