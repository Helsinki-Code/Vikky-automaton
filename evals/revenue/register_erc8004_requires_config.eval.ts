import { defineEval } from "eve/evals";

/**
 * Without RPC_URL/ERC8004_REGISTRY_ADDRESS configured (the default
 * local/eval environment), register_erc8004 must honestly report it's not
 * configured rather than attempting a chain call. Deterministic: the config
 * check happens before any network access.
 */
export default defineEval({
  description: "register_erc8004 reports registered:false with a clear reason when on-chain config is unset.",
  async test(t) {
    await t.send('Call register_erc8004 with agentURI "https://example.com/agent-card.json".');

    if (t.events.some((e) => e.type === "input.requested")) {
      await t.respondAll("approve");
    }

    t.succeeded();
    t.calledTool("register_erc8004", {
      output: (out) =>
        typeof out === "object" &&
        out !== null &&
        (out as { registered?: boolean }).registered === false &&
        typeof (out as { reason?: string }).reason === "string" &&
        (out as { reason: string }).reason.toLowerCase().includes("not configured"),
      count: (n) => n >= 1,
    });
  },
});
