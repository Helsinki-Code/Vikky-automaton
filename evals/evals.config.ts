import { openai } from "@ai-sdk/openai";
import { defineEvalConfig } from "eve/evals";

export default defineEvalConfig({
  // Direct-provider judge model (uses OPENAI_API_KEY from .env.local) —
  // a bare Gateway model id string would require AI_GATEWAY_API_KEY instead,
  // which this project doesn't have configured.
  // Never the model under test — that stays whatever agent/agent.ts configures.
  judge: { model: openai("gpt-5-mini") },
  maxConcurrency: 4,
  timeoutMs: 60_000,
});
