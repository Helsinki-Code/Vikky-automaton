import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { accountId, cf } from "../lib/cloudflare";

export default defineTool({
  description:
    "Register (purchase) a domain through Cloudflare Registrar, or list domains already held in the account. Registration spends real money and ALWAYS requires creator approval.",
  approval: always(),
  inputSchema: z.object({
    action: z.enum(["list_owned", "register"]),
    domain: z.string().optional().describe("Full domain to register, e.g. vikky-automaton.com"),
    years: z.number().int().min(1).max(5).default(1),
  }),
  async execute({ action, domain, years }) {
    const account = accountId();
    if (action === "list_owned") {
      const domains = await cf<Array<{ name: string; expires_at?: string; current_registrar?: string }>>(
        "GET",
        `/accounts/${account}/registrar/domains`,
      );
      return { domains };
    }
    if (!domain) throw new Error("domain is required for register.");
    // Cloudflare Registrar purchase endpoint; billing uses the account's
    // payment method on file — no card data ever passes through the agent.
    const result = await cf(
      "POST",
      `/accounts/${account}/registrar/domains/${encodeURIComponent(domain)}`,
      { years },
    );
    return { requested: true, domain, years, result };
  },
});
