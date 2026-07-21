import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { loadVercelDeployConfig, collectSandboxFiles, createVercelDeployment, pollDeploymentReady } from "../lib/vercel-deploy";

export default defineTool({
  description:
    "Deploy a directory you've built in your sandbox (with bash/write_file) as its own real, public Vercel project — a genuine public URL others can reach and pay for, not a sandbox-only preview. This is how you actually host a paid service instead of just building one nobody can access. Requires AUTOMATON_VERCEL_TOKEN to be configured. Always requires creator approval since it creates new billed infrastructure under your Vercel account.",
  approval: always(),
  inputSchema: z.object({
    name: z.string().min(1).max(64).describe("Project name — becomes part of the deployment URL"),
    sourceDir: z.string().min(1).describe("Absolute sandbox path to the directory to deploy, e.g. /workspace/services/my-api"),
  }),
  async execute({ name, sourceDir }, ctx) {
    const config = loadVercelDeployConfig();
    if (!config) {
      return {
        deployed: false,
        reason: "AUTOMATON_VERCEL_TOKEN is not set. The creator needs to add a Vercel API token (with deploy scope) as an env var before you can deploy public services.",
      };
    }

    const sandbox = await ctx.getSandbox();
    const { files, truncated } = await collectSandboxFiles(sandbox, sourceDir);
    if (files.length === 0) {
      return { deployed: false, reason: `No readable files found under ${sourceDir}.` };
    }

    const created = await createVercelDeployment(config, name, files);
    const finalState = await pollDeploymentReady(config, created.id);

    return {
      deployed: finalState.readyState === "READY",
      readyState: finalState.readyState,
      url: finalState.url || created.url,
      filesDeployed: files.length,
      truncated,
      note: truncated
        ? "Some files were skipped (count/size caps) — keep services lean: source + package.json, no node_modules or build output."
        : undefined,
    };
  },
});
