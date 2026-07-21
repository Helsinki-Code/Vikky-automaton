import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

/**
 * Long-term memory must survive across turns within a session — this is the
 * durability property the whole rebuild depends on (memory.json outlives
 * eve's per-session defineState).
 */
export default defineEval({
  description: "A fact stored with remember is retrievable with recall in a later turn.",
  async test(t) {
    const marker = `eval-marker-${Date.now()}`;

    await t.send(
      `Use the remember tool to store this exact semantic fact with importance 0.9: "The creator's favorite eval marker is ${marker}."`,
    );
    t.succeeded();
    t.calledTool("remember", { count: 1 });

    await t.send(`Use recall to search for "eval marker" and tell me what you find.`);
    t.succeeded();
    t.calledTool("recall", { count: 1 });
    t.check(t.reply, includes(marker));
  },
});
