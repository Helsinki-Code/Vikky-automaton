import { defineTool } from "eve/tools";
import { once } from "eve/tools/approval";
import { z } from "zod";
import { cf } from "../lib/cloudflare";

interface Zone {
  id: string;
  name: string;
  status: string;
}

interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
}

async function zoneIdFor(domain: string): Promise<string> {
  const zones = await cf<Zone[]>("GET", `/zones?name=${encodeURIComponent(domain)}`);
  if (!zones.length) {
    throw new Error(`No Cloudflare zone found for ${domain}. Add the domain to the Cloudflare account first.`);
  }
  return zones[0].id;
}

export default defineTool({
  description:
    "Manage DNS on Cloudflare: list zones, list records for a domain, add a record, or delete a record. Mutations (add/delete) require creator approval once per session.",
  approval: once(),
  inputSchema: z.object({
    action: z.enum(["list_zones", "list_records", "add_record", "delete_record"]),
    domain: z.string().optional().describe("Zone domain, e.g. example.com (required except list_zones)"),
    record: z
      .object({
        type: z.enum(["A", "AAAA", "CNAME", "TXT", "MX", "NS"]),
        name: z.string(),
        content: z.string(),
        ttl: z.number().int().min(60).max(86400).default(3600),
        proxied: z.boolean().default(false),
      })
      .optional()
      .describe("For add_record"),
    recordId: z.string().optional().describe("For delete_record"),
  }),
  async execute({ action, domain, record, recordId }) {
    if (action === "list_zones") {
      const zones = await cf<Zone[]>("GET", "/zones?per_page=50");
      return { zones: zones.map((zone) => ({ name: zone.name, status: zone.status })) };
    }
    if (!domain) throw new Error(`domain is required for ${action}.`);
    const zoneId = await zoneIdFor(domain);

    if (action === "list_records") {
      const records = await cf<DnsRecord[]>("GET", `/zones/${zoneId}/dns_records?per_page=100`);
      return { domain, records };
    }
    if (action === "add_record") {
      if (!record) throw new Error("record is required for add_record.");
      const created = await cf<DnsRecord>("POST", `/zones/${zoneId}/dns_records`, record);
      return { added: true, record: created };
    }
    // delete_record
    if (!recordId) throw new Error("recordId is required for delete_record.");
    await cf("DELETE", `/zones/${zoneId}/dns_records/${recordId}`);
    return { deleted: true, recordId };
  },
});
