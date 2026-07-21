/**
 * Model registry — provider-agnostic catalog with pricing, mirroring the
 * original repo's ModelRegistry/STATIC_MODEL_BASELINE. Used by list_models /
 * switch_model and by check_inference_spending's cost estimates.
 */

import { readJson, writeJson } from "./store";

export interface ModelEntry {
  modelId: string;
  provider: "openai" | "anthropic";
  displayName: string;
  tierMinimum: "dead" | "critical" | "low_compute" | "normal" | "high";
  costPer1kInputCents: number;
  costPer1kOutputCents: number;
}

export const MODEL_CATALOG: ModelEntry[] = [
  { modelId: "gpt-5.2", provider: "openai", displayName: "GPT-5.2", tierMinimum: "normal", costPer1kInputCents: 0.18, costPer1kOutputCents: 1.4 },
  { modelId: "gpt-5-mini", provider: "openai", displayName: "GPT-5 Mini", tierMinimum: "critical", costPer1kInputCents: 0.03, costPer1kOutputCents: 0.24 },
  { modelId: "claude-opus-4-8", provider: "anthropic", displayName: "Claude Opus 4.8", tierMinimum: "high", costPer1kInputCents: 0.5, costPer1kOutputCents: 2.5 },
  { modelId: "claude-sonnet-5", provider: "anthropic", displayName: "Claude Sonnet 5", tierMinimum: "normal", costPer1kInputCents: 0.3, costPer1kOutputCents: 1.5 },
  { modelId: "claude-haiku-4-5", provider: "anthropic", displayName: "Claude Haiku 4.5", tierMinimum: "critical", costPer1kInputCents: 0.08, costPer1kOutputCents: 0.4 },
];

const SELECTED_FILE = "selected-model.json";

export function getSelectedModel(): string {
  return readJson<{ modelId: string }>(SELECTED_FILE, { modelId: "gpt-5.2" }).modelId;
}

export function setSelectedModel(modelId: string): void {
  writeJson(SELECTED_FILE, { modelId });
}

interface SpendRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  timestamp: string;
}

const SPEND_FILE = "inference-spend.json";

export function recordInferenceSpend(model: string, inputTokens: number, outputTokens: number): number {
  const entry = MODEL_CATALOG.find((m) => m.modelId === model);
  const costCents = entry
    ? (inputTokens / 1000) * entry.costPer1kInputCents + (outputTokens / 1000) * entry.costPer1kOutputCents
    : 0;
  const records = readJson<SpendRecord[]>(SPEND_FILE, []);
  records.push({ model, inputTokens, outputTokens, costCents, timestamp: new Date().toISOString() });
  writeJson(SPEND_FILE, records.slice(-1000));
  return costCents;
}

export function getSpendSummary(sinceHours = 24): { totalCostCents: number; byModel: Record<string, number>; callCount: number } {
  const cutoff = Date.now() - sinceHours * 3_600_000;
  const records = readJson<SpendRecord[]>(SPEND_FILE, []).filter(
    (r) => new Date(r.timestamp).getTime() > cutoff,
  );
  const byModel: Record<string, number> = {};
  let total = 0;
  for (const r of records) {
    byModel[r.model] = (byModel[r.model] || 0) + r.costCents;
    total += r.costCents;
  }
  return { totalCostCents: total, byModel, callCount: records.length };
}
