import { defineEval } from "eve/evals";

/**
 * confirm_deposit is not approval-gated (it only verifies truth with Stripe
 * and credits if paid) — no HITL to resolve here. An unknown checkout
 * session id must never be reported as credited; this is the invariant that
 * protects the ledger from being credited by a fabricated session id.
 */
export default defineEval({
  description: "confirm_deposit never reports credited:true for a checkout session id that doesn't exist.",
  async test(t) {
    await t.send('Call confirm_deposit with checkoutSessionId "cs_test_eval_does_not_exist_12345".');
    t.succeeded();
    t.calledTool("confirm_deposit", {
      output: (out) => typeof out === "object" && out !== null && (out as { credited?: boolean }).credited === true,
      count: 0,
    });
  },
});
