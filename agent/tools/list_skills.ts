import { defineTool } from "eve/tools";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

const SKILLS_DIR = path.join(process.cwd(), "agent", "skills");

export default defineTool({
  description: "List all installed skills (built-in and self-created) with their descriptions.",
  inputSchema: z.object({}),
  async execute() {
    if (!fs.existsSync(SKILLS_DIR)) return { skills: [] };
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    const skills: Array<{ name: string; description: string }> = [];
    for (const entry of entries) {
      let file: string | null = null;
      let name = entry.name;
      if (entry.isFile() && entry.name.endsWith(".md")) {
        file = path.join(SKILLS_DIR, entry.name);
        name = entry.name.replace(/\.md$/, "");
      } else if (entry.isDirectory()) {
        const skillMd = path.join(SKILLS_DIR, entry.name, "SKILL.md");
        if (fs.existsSync(skillMd)) file = skillMd;
      }
      if (!file) continue;
      const content = fs.readFileSync(file, "utf-8");
      const match = content.match(/description:\s*(.+)/);
      const firstLine = content.split("\n").find((l) => l.trim() && !l.trim().startsWith("---"));
      skills.push({ name, description: match?.[1]?.trim() || firstLine?.trim() || "" });
    }
    return { skills };
  },
});
