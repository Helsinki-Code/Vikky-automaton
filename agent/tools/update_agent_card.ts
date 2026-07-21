import { defineTool } from "eve/tools";
import { z } from "zod";
import { setAgentCard, getAgentCard } from "../lib/registry";

export default defineTool({
  description:
    "Update your public agent card: name, description, and advertised services/endpoints. This is what other agents see via discover_agents.",
  inputSchema: z.object({
    name: z.string().min(1),
    description: z.string().min(1).max(1000),
    services: z.array(z.object({ name: z.string(), endpoint: z.string().url() })).default([]),
    active: z.boolean().default(true),
  }),
  async execute({ name, description, services, active }) {
    setAgentCard({ name, description, services, active });
    return { updated: true, card: getAgentCard() };
  },
});
