import { defineTool } from "eve/tools";
import { z } from "zod";

/**
 * A real, freely accessible, no-API-key job listings feed
 * (https://remoteok.com/api) — not a fabricated endpoint. This is a job
 * board, not a full gig-marketplace with a "hire" flow: it surfaces paid
 * opportunities to look at, not something you can programmatically accept.
 * True freelance marketplaces (Upwork, Freelancer.com) require an approved
 * OAuth application per-developer, which isn't something to wire up
 * speculatively without a real account behind it — this is the honest,
 * usable middle ground: real data, zero new credentials required.
 */
const REMOTEOK_API = "https://remoteok.com/api";

interface RemoteOkListing {
  id?: string;
  position?: string;
  company?: string;
  description?: string;
  tags?: string[];
  url?: string;
  date?: string;
}

export default defineTool({
  description:
    "Search a real, public remote-work listings feed for paid opportunities matching a keyword. This is a job board, not a marketplace you can programmatically accept work on — treat results as leads to evaluate (with web_fetch) and act on yourself, not an auto-apply.",
  inputSchema: z.object({
    keyword: z.string().min(1).max(100),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  async execute({ keyword, limit }) {
    try {
      const resp = await fetch(REMOTEOK_API, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; automaton-research/1.0)" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) {
        return { found: false, reason: `Listings feed returned HTTP ${resp.status}.` };
      }
      const data = (await resp.json()) as RemoteOkListing[];
      // First element is feed metadata (legal notice), not a listing.
      const listings = data.slice(1);
      const q = keyword.toLowerCase();
      const matches = listings
        .filter((l) => {
          const haystack = `${l.position ?? ""} ${l.description ?? ""} ${(l.tags ?? []).join(" ")}`.toLowerCase();
          return haystack.includes(q);
        })
        .slice(0, limit)
        .map((l) => ({
          position: l.position,
          company: l.company,
          tags: l.tags,
          url: l.url,
          postedAt: l.date,
        }));
      return { found: true, count: matches.length, listings: matches };
    } catch (err) {
      return { found: false, reason: err instanceof Error ? err.message : String(err) };
    }
  },
});
