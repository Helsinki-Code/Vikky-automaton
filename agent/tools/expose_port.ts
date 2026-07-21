import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Verify a local server is listening on a port inside your sandbox (after starting one, e.g. with bash + spawn-style background process). Note: eve's sandbox session handle does not expose a runtime 'get public URL' call — the Vercel backend's exposed ports are declared once in agent/sandbox/sandbox.ts's backend config (the vercel() factory's `ports` option) and take effect on the next redeploy, not mid-session. Use edit_own_file on that config to add a port, then this tool to confirm the process behind it is actually up.",
  inputSchema: z.object({ port: z.number().int().min(1).max(65535) }),
  async execute({ port }, ctx) {
    const sandbox = await ctx.getSandbox();
    const result = await sandbox.run({
      command: `curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://localhost:${port} || echo unreachable`,
    });
    const status = result.stdout.trim();
    const listening = status !== "unreachable" && status !== "";
    return {
      port,
      listening,
      httpStatus: listening ? status : null,
      note: "To make this port publicly reachable, declare it in agent/sandbox/sandbox.ts's backend ports config and redeploy.",
    };
  },
});
