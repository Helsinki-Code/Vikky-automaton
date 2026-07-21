import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const PROTECTED = new Set([
  // instructions.ts assembles the prompt from lib/constitution.ts — both
  // must be protected, or the Constitution text could be edited indirectly
  // through the file that actually holds it.
  "agent/instructions.ts",
  "agent/lib/constitution.ts",
  ".env.local",
  "package.json",
]);

function assertSafe(relPath: string): string {
  const resolved = path.normalize(path.join(PROJECT_ROOT, relPath));
  if (!resolved.startsWith(PROJECT_ROOT)) {
    throw new Error("Refusing to write outside the project root.");
  }
  if (PROTECTED.has(relPath.replace(/^\/+/, ""))) {
    throw new Error(
      `${relPath} is protected (contains the immutable Constitution or secrets). Not editable by this tool.`,
    );
  }
  return resolved;
}

export default defineTool({
  description:
    "Edit one of your own source files under agent/ (tools, skills, subagents, lib, etc). This is self-modification: it happens in the app runtime, not the sandbox, and is committed to git so it can be reviewed and reverted. instructions.ts and lib/constitution.ts (the Constitution) and secrets are protected and cannot be edited this way.",
  approval: once(),
  inputSchema: z.object({
    relativePath: z.string().min(1).describe("Path relative to the project root, e.g. agent/tools/my_tool.ts"),
    content: z.string(),
    commitMessage: z.string().min(1),
  }),
  async execute({ relativePath, content, commitMessage }) {
    const resolved = assertSafe(relativePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    const existed = fs.existsSync(resolved);
    fs.writeFileSync(resolved, content, "utf-8");

    const { execSync } = await import("node:child_process");
    try {
      execSync(`git add "${relativePath}"`, { cwd: PROJECT_ROOT });
      execSync(`git commit -m ${JSON.stringify(`self-mod: ${commitMessage}`)}`, {
        cwd: PROJECT_ROOT,
      });
    } catch (err: any) {
      return {
        written: true,
        created: !existed,
        committed: false,
        gitError: err.message,
        note: "File was written but git commit failed (maybe no git repo, or nothing changed).",
      };
    }
    return { written: true, created: !existed, committed: true };
  },
});
