import { defineTool } from "eve/tools";
import { z } from "zod";
import { getOrCreateWallet } from "../lib/wallet";

export default defineTool({
  description:
    "Report this automaton's sovereign wallet address and chain type. The wallet is generated once automatically on first boot and never changes — this is your on-chain identity.",
  inputSchema: z.object({}),
  async execute() {
    const wallet = getOrCreateWallet();
    return {
      address: wallet.address,
      chainType: wallet.chainType,
      createdAt: wallet.createdAt,
    };
  },
});
