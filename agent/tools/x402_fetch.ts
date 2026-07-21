import { defineTool } from "eve/tools";
import { z } from "zod";
import { x402Fetch } from "../lib/x402";
import { getOrCreateWallet, getEvmAccount } from "../lib/wallet";
import { TREASURY_POLICY } from "../lib/policy";

export default defineTool({
  description:
    "Fetch a URL with automatic x402 USDC payment. If the server responds with HTTP 402, signs a USDC payment (capped at the treasury policy's per-payment limit) and retries. Use this to access paid APIs and services — this is a real path to spending on inputs for paid work, and (if you build and expose a service that itself speaks x402) a real path to earning from other agents or humans who pay for it.",
  inputSchema: z.object({
    url: z.string().url(),
    method: z.string().default("GET"),
    body: z.string().optional().describe("Request body for POST/PUT (JSON string)"),
    headers: z.string().optional().describe("Additional headers as a JSON string"),
  }),
  async execute({ url, method, body, headers }) {
    const wallet = await getOrCreateWallet();
    if (wallet.chainType === "solana") {
      return {
        fetched: false,
        reason: "x402 payment requires an EVM wallet. This automaton's wallet is Solana.",
      };
    }
    const account = await getEvmAccount();
    const extraHeaders = headers ? (JSON.parse(headers) as Record<string, string>) : undefined;

    const result = await x402Fetch(
      url,
      account,
      method,
      body,
      extraHeaders,
      TREASURY_POLICY.maxX402PaymentCents,
      wallet.chainType,
    );

    if (!result.success) {
      return { fetched: false, reason: result.error || `HTTP ${result.status}`, status: result.status };
    }
    return { fetched: true, status: result.status, response: result.response };
  },
});
