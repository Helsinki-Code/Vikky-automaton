import { defineTool } from "eve/tools";
import { z } from "zod";
import { removeService } from "../lib/services";

export default defineTool({
  description:
    "Mark a deployed service as removed, freeing its slot against the MAX_ACTIVE_SERVICES cap so you can deploy another. Does not delete the underlying Vercel project or its revenue history — just stops it counting toward the active cap and drops it from list_services' active view.",
  inputSchema: z.object({ serviceId: z.string().min(1) }),
  async execute({ serviceId }) {
    const service = await removeService(serviceId);
    if (!service) return { removed: false, reason: `No service with id ${serviceId}.` };
    return { removed: true, service };
  },
});
