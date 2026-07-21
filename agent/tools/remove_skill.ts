import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

const SKILLS_DIR = path.join(process.cwd(), "agent", "skills");
const PROTECTED = new Set(["survival", "replication"]);

export default defineTool({
  description: "Remove a self-created skill. Built-in skills (survival, replication) are protected.",
  approval: once(),
  inputSchema: z.object({ name: z.string().min(1) }),
  async execute({ name }) {
    if (PROTECTED.has(name)) {
      return { removed: false, reason: `"${name}" is a built-in skill and cannot be removed.` };
    }
    const flatFile = path.join(SKILLS_DIR, `${name}.md`);
    const dirFile = path.join(SKILLS_DIR, name);
    if (fs.existsSync(flatFile)) {
      fs.unlinkSync(flatFile);
      return { removed: true, name };
    }
    if (fs.existsSync(dirFile)) {
      fs.rmSync(dirFile, { recursive: true, force: true });
      return { removed: true, name };
    }
    return { removed: false, reason: `No skill named "${name}" found.` };
  },
});
