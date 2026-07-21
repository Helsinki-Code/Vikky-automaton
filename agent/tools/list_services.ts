import { defineTool } from "eve/tools";
import { z } from "zod";
import { listServices } from "../lib/services";
import { revenueByService } from "../lib/service-revenue";

export default defineTool({
  description: "List every service you've deployed via deploy_service, with status and revenue attributed to each.",
  inputSchema: z.object({}),
  async execute() {
    const services = await listServices();
    const revenue = await revenueByService();
    return {
      count: services.length,
      active: services.filter((s) => s.status === "active").length,
      services: services.map((s) => ({
        ...s,
        revenueCents: revenue[s.id]?.totalCents ?? 0,
        paymentCount: revenue[s.id]?.count ?? 0,
      })),
    };
  },
});
