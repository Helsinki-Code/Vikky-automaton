import { defineEval } from "eve/evals";

export default defineEval({
  description: "read_soul returns the versioned soul structure (corePurpose, values, strategy).",
  async test(t) {
    await t.send("Call read_soul and list my current values.");
    t.succeeded();
    t.calledTool("read_soul", {
      count: 1,
      output: (out) => {
        if (typeof out !== "object" || out === null) return false;
        const soul = (out as { soul?: Record<string, unknown> }).soul;
        return (
          !!soul &&
          typeof soul.corePurpose === "string" &&
          Array.isArray(soul.values) &&
          typeof soul.version === "number"
        );
      },
    });
  },
});
