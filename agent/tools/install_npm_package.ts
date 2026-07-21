import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import { execSync } from "node:child_process";

export default defineTool({
  description:
    "Install an npm package as a dependency of your own project (app runtime, not the sandbox). Use for a library your tools/lib code needs to import.",
  approval: once(),
  inputSchema: z.object({
    packageName: z.string().min(1).regex(/^[@a-z0-9][a-z0-9._/-]*$/i, "must be a valid npm package name"),
    dev: z.boolean().default(false),
  }),
  async execute({ packageName, dev }) {
    const cmd = `npm install ${dev ? "--save-dev" : ""} ${packageName}`.trim();
    const output = execSync(cmd, { cwd: process.cwd(), timeout: 120_000 }).toString();
    return { installed: packageName, dev, output: output.slice(-2000) };
  },
});
