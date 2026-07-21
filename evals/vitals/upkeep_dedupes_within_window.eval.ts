import { defineEval } from "eve/evals";

/**
 * record_upkeep must not double-charge if called twice in quick succession —
 * this is the guard against a runaway loop draining the ledger.
 *
 * Note: the ledger is a single shared JSON file (agent/lib/store.ts), not
 * scoped per eval session, so a concurrently-running eval (e.g. the
 * heartbeat schedule eval) can have already charged upkeep inside the same
 * 10-minute dedup window. That makes BOTH calls here legitimately return
 * charged:false. The invariant that holds regardless of prior state is "at
 * most one of these two calls actually charges" — never assert exactly one.
 */
export default defineEval({
  description: "record_upkeep never charges twice for two calls made in quick succession.",
  async test(t) {
    await t.send("Call record_upkeep twice in a row and tell me what happened both times.");
    t.succeeded();
    t.calledTool("record_upkeep", { count: 2 });
    t.calledTool("record_upkeep", {
      output: (out) => typeof out === "object" && out !== null && (out as { charged?: boolean }).charged === true,
      count: (count) => count <= 1,
    });
  },
});
