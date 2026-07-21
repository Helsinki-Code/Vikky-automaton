import { defineTool } from "eve/tools";
import { z } from "zod";
import { checkAvailability } from "../lib/cloudflare";

export default defineTool({
  description:
    "Check domain name availability across TLDs (via public RDAP registries). Use when scouting a domain before registering it.",
  inputSchema: z.object({
    name: z.string().min(1).max(63).describe("Base name without TLD, e.g. 'vikky-automaton'"),
    tlds: z.array(z.string()).max(8).default(["com", "dev", "ai", "io"]),
  }),
  async execute({ name, tlds }) {
    const results = await Promise.all(
      tlds.map((tld) => checkAvailability(`${name}.${tld.replace(/^\./, "")}`)),
    );
    return {
      results: results.map((r) => ({
        domain: r.domain,
        available: r.registered === false,
        status: r.registered === "unknown" ? "unknown" : r.registered ? "taken" : "available",
      })),
      note: "Availability via RDAP is a strong signal but final confirmation happens at registration.",
    };
  },
});
