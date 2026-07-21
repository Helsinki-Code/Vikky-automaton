import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { getRegistryEntry, setRegistryEntry } from "../lib/registry";
import { loadErc8004Config, registerAgentOnChain } from "../lib/erc8004";

export default defineTool({
  description:
    "Register your on-chain identity in an ERC-8004 agent registry (one-time, immutable once confirmed), signed by your own auto-generated wallet. Requires RPC_URL and ERC8004_REGISTRY_ADDRESS env vars. Always requires creator approval — it's an irreversible on-chain write that spends gas.",
  approval: always(),
  inputSchema: z.object({
    agentURI: z.string().url().describe("Publicly reachable URI describing this agent (an agent card JSON)"),
  }),
  async execute({ agentURI }) {
    const existing = getRegistryEntry();
    if (existing) {
      return { registered: false, reason: "Already registered on-chain.", existing };
    }
    const config = loadErc8004Config();
    if (!config) {
      return {
        registered: false,
        reason:
          "On-chain registration is not configured. Set RPC_URL and ERC8004_REGISTRY_ADDRESS in .env.local (your wallet is generated automatically).",
      };
    }
    const { txHash, agentId } = await registerAgentOnChain(config, agentURI);
    const entry = {
      agentId: agentId || "unknown",
      chain: "base",
      contractAddress: config.contractAddress,
      txHash,
      registeredAt: new Date().toISOString(),
    };
    setRegistryEntry(entry);
    return { registered: true, ...entry };
  },
});
