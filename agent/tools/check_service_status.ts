import { defineTool } from "eve/tools";
import { z } from "zod";
import { listServices, updateServiceStatus } from "../lib/services";

export default defineTool({
  description: "Check whether a deployed service (see list_services) is still reachable, and update its recorded status.",
  inputSchema: z.object({ serviceId: z.string().min(1) }),
  async execute({ serviceId }) {
    const service = (await listServices()).find((s) => s.id === serviceId);
    if (!service) return { checked: false, reason: `No service with id ${serviceId}.` };

    try {
      const resp = await fetch(service.url, { method: "GET", signal: AbortSignal.timeout(8_000) });
      const healthy = resp.status < 500;
      const updated = await updateServiceStatus(serviceId, healthy ? "active" : "unreachable");
      return { checked: true, healthy, status: updated?.status, url: service.url };
    } catch {
      const updated = await updateServiceStatus(serviceId, "unreachable");
      return { checked: true, healthy: false, status: updated?.status, url: service.url };
    }
  },
});
