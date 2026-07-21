import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import { execSync } from "node:child_process";

export default defineTool({
  description:
    "Revert the most recent self-modification commit (created by edit_own_file). Use when a self-edit broke something.",
  approval: once(),
  inputSchema: z.object({}),
  async execute() {
    const lastMessage = execSync("git log -1 --pretty=%s", { cwd: process.cwd() }).toString().trim();
    if (!lastMessage.startsWith("self-mod:")) {
      return {
        reverted: false,
        reason: `Last commit ("${lastMessage}") was not a self-mod commit — refusing to revert unrelated history.`,
      };
    }
    execSync("git revert --no-edit HEAD", { cwd: process.cwd() });
    return { reverted: true, revertedCommitMessage: lastMessage };
  },
});
