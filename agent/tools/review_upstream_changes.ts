import { defineTool } from "eve/tools";
import { z } from "zod";
import { execSync } from "node:child_process";

export default defineTool({
  description:
    "Fetch and show what changed on the upstream remote (origin) without applying it. Use before pull_upstream to review incoming changes.",
  inputSchema: z.object({
    remote: z.string().default("origin"),
    branch: z.string().default("main"),
  }),
  async execute({ remote, branch }) {
    execSync(`git fetch ${remote} ${branch}`, { cwd: process.cwd() });
    const diff = execSync(`git log HEAD..${remote}/${branch} --oneline`, {
      cwd: process.cwd(),
    }).toString();
    return {
      incomingCommits: diff.split("\n").filter(Boolean),
      note: diff.trim() ? "Run pull_upstream to apply these." : "Already up to date.",
    };
  },
});
