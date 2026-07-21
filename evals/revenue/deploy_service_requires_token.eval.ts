import { defineEval } from "eve/evals";

/**
 * Without AUTOMATON_VERCEL_TOKEN configured (the default local/eval
 * environment), deploy_service must honestly report it's not configured
 * rather than silently doing nothing or claiming success. This is checked
 * before any sandbox or Vercel API work happens, so it's deterministic
 * regardless of what a source directory contains.
 */
export default defineEval({
  description: "deploy_service reports deployed:false with a clear reason when AUTOMATON_VERCEL_TOKEN is unset.",
  async test(t) {
    await t.send('Call deploy_service with name "eval-test-service", sourceDir "/workspace".');

    if (t.events.some((e) => e.type === "input.requested")) {
      await t.respondAll("approve");
    }

    t.succeeded();
    t.calledTool("deploy_service", {
      output: (out) =>
        typeof out === "object" &&
        out !== null &&
        (out as { deployed?: boolean }).deployed === false &&
        typeof (out as { reason?: string }).reason === "string" &&
        (out as { reason: string }).reason.includes("AUTOMATON_VERCEL_TOKEN"),
      count: (n) => n >= 1,
    });
  },
});
