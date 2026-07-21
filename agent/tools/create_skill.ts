import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

const SKILLS_DIR = path.join(process.cwd(), "agent", "skills");

export default defineTool({
  description:
    "Create a new on-demand skill (a markdown procedure loaded when relevant). Use for a repeatable procedure you've discovered works well — not for one-off notes (use remember for those).",
  approval: once(),
  inputSchema: z.object({
    name: z.string().min(1).regex(/^[a-z0-9-]+$/, "lowercase, hyphens only"),
    description: z.string().min(10).describe("The routing hint the model uses to decide when to load this"),
    markdown: z.string().min(1),
  }),
  async execute({ name, description, markdown }) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
    const file = path.join(SKILLS_DIR, `${name}.md`);
    const content = `---\ndescription: ${description}\n---\n\n${markdown}\n`;
    fs.writeFileSync(file, content, "utf-8");
    return { created: true, name, path: `agent/skills/${name}.md` };
  },
});
