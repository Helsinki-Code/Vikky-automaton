import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";

const VALID_TIERS = ["dead", "critical", "low_compute", "normal", "high"];

export default defineEval({
  description: "check_vitals is called and returns a real survival tier from the ledger, not a hallucinated one.",
  async test(t) {
    await t.send("Call check_vitals and tell me my balance and survival tier.");
    t.succeeded();
    t.calledTool("check_vitals", { count: 1 });

    t.check(
      t.reply,
      satisfies(
        (reply: string) =>
          VALID_TIERS.some(
            (tier) => reply.toLowerCase().includes(tier.replace("_", " ")) || reply.toLowerCase().includes(tier),
          ),
        "reply mentions a real survival tier from check_vitals output",
      ),
    );
  },
});
