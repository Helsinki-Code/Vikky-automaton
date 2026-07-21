import { openai } from "@ai-sdk/openai";
import { defineAgent, defineDynamic } from "eve";
import { getSelectedModel } from "./lib/models";
import { resolveModel } from "./lib/model-resolver";

export default defineAgent({
  // Dynamic: switch_model records a preference in .automaton/selected-model.json;
  // this resolver reads it before every model call, so a switch takes effect
  // on the very next call with no redeploy. Direct-provider LanguageModel
  // instances (not Gateway model-id strings) are only serializable from
  // step.started — session.started/turn.started require a plain string,
  // per eve's dynamic-capabilities contract — so this must be step-scoped.
  // (The resolver's own recorded preference already only changes between
  // sessions in practice, since switch_model is a full tool call.)
  model: defineDynamic({
    fallback: openai("gpt-5.2"),
    events: {
      "step.started": () => resolveModel(getSelectedModel()),
    },
  }),
  reasoning: "medium",
  limits: {
    // Keep a sane per-session ceiling; the ledger governs long-run survival.
    maxInputTokensPerSession: 2_000_000,
  },
});
