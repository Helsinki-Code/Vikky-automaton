import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

/**
 * Confirms the sandbox is real compute (Vercel Sandbox / Docker / etc via
 * defaultBackend()), not a stub — the built-in bash tool must actually run
 * commands and return real stdout from /workspace.
 */
export default defineEval({
  description: "The bash tool executes a real command in /workspace and returns its stdout.",
  async test(t) {
    await t.send("Run bash: pwd && echo eval-sandbox-check-ok");
    t.succeeded();
    t.calledTool("bash", {
      count: 1,
      output: (out) =>
        typeof out === "object" &&
        out !== null &&
        String((out as { stdout?: string }).stdout).includes("/workspace") &&
        String((out as { stdout?: string }).stdout).includes("eval-sandbox-check-ok"),
    });
    t.check(t.reply, includes("eval-sandbox-check-ok"));
  },
});
