/**
 * Resolves a MODEL_CATALOG entry to a real AI SDK LanguageModel instance.
 * Used by agent.ts's defineDynamic resolver so switch_model's recorded
 * preference actually takes effect on the next session, with no redeploy.
 */

import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { MODEL_CATALOG } from "./models";

/** Anthropic model ids use hyphens throughout; strip the trailing -N.M patch style used in the catalog id. */
const ANTHROPIC_ID_MAP: Record<string, string> = {
  "claude-opus-4-8": "claude-opus-4-8",
  "claude-sonnet-5": "claude-sonnet-5",
  "claude-haiku-4-5": "claude-haiku-4-5-20251001",
};

export function resolveModel(modelId: string) {
  const entry = MODEL_CATALOG.find((m) => m.modelId === modelId);
  if (!entry) return null;
  if (entry.provider === "openai") return openai(entry.modelId);
  return anthropic(ANTHROPIC_ID_MAP[entry.modelId] ?? entry.modelId);
}
