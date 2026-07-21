import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

const CONNECTIONS_DIR = path.join(process.cwd(), "agent", "connections");

export default defineTool({
  description:
    "Install a new MCP server as a connection, giving you its tools under a namespace (e.g. linear__create_issue). Writes agent/connections/<name>.ts with static bearer-token auth read from an env var you set yourself, and gates every tool the server exposes behind one approval per session. Eve discovers connections from the filesystem, so this takes effect on the next reload (eve dev) or the next deploy (production) — not immediately in this turn.",
  approval: once(),
  inputSchema: z.object({
    name: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, "lowercase, hyphens only — becomes the connection name and tool namespace"),
    mcpUrl: z.string().url().describe("Streamable HTTP or SSE MCP server URL"),
    description: z
      .string()
      .min(10)
      .describe("What this connection is for — the main signal connection_search uses to route to it"),
    tokenEnvVar: z
      .string()
      .min(1)
      .describe("Name of the env var holding the bearer token, e.g. LINEAR_API_TOKEN — set it in .env.local yourself first"),
    toolAllowlist: z
      .array(z.string())
      .optional()
      .describe("Bare remote tool names to expose; omit to expose everything the server publishes"),
  }),
  async execute({ name, mcpUrl, description, tokenEnvVar, toolAllowlist }) {
    fs.mkdirSync(CONNECTIONS_DIR, { recursive: true });
    const file = path.join(CONNECTIONS_DIR, `${name}.ts`);
    if (fs.existsSync(file)) {
      return { installed: false, reason: `agent/connections/${name}.ts already exists.` };
    }
    const toolsBlock = toolAllowlist?.length
      ? `\n  tools: { allow: ${JSON.stringify(toolAllowlist)} },`
      : "";
    const content = `import { defineMcpClientConnection } from "eve/connections";
import { once } from "eve/tools/approval";

export default defineMcpClientConnection({
  url: ${JSON.stringify(mcpUrl)},
  description: ${JSON.stringify(description)},
  auth: {
    getToken: async () => ({ token: process.env.${tokenEnvVar}! }),
  },${toolsBlock}
  // Every tool this server exposes is gated once per session by default.
  // Narrow to per-tool policies (see the MCP connections doc) once you know
  // which of its tools are read-only vs. destructive.
  approval: once(),
});
`;
    fs.writeFileSync(file, content, "utf-8");
    return {
      installed: true,
      connectionName: name,
      path: `agent/connections/${name}.ts`,
      toolNamespace: `${name}__*`,
      note: `Set ${tokenEnvVar} in .env.local (or the Vercel project env) if you haven't. Tools appear as ${name}__<tool> after the next reload/deploy, discoverable via connection_search.`,
    };
  },
});
