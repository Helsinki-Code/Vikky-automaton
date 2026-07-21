import { defineEval } from "eve/evals";

/**
 * The single "does the agent boot and think" check. Everything else in this
 * suite assumes this passes — if it doesn't, look here first.
 */
export default defineEval({
  description: "Agent boots, accepts a message, and replies without any tool calls.",
  async test(t) {
    await t.send("Say hello in one short sentence. Do not call any tools.");
    t.succeeded();
    t.usedNoTools();
  },
});
