import type { EvalScores } from "../models/types.js";

const DIMENSIONS = ["grounding", "voice", "expertiseLens", "nonObviousness"] as const;
export type EvalDimension = (typeof DIMENSIONS)[number];

function clampLikert(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}

/** Legacy sessions stored 0–100; map to 1–5 for display and storage. */
function fromLegacyPercent(value: number): number {
  if (value <= 5) return clampLikert(value);
  return clampLikert(value / 20);
}

function readJustifications(raw: Record<string, unknown>): EvalScores["justifications"] | undefined {
  const source = raw.justifications;
  if (!source || typeof source !== "object") return undefined;

  const record = source as Record<string, unknown>;
  const result: NonNullable<EvalScores["justifications"]> = {};

  for (const key of DIMENSIONS) {
    const text = record[key];
    if (typeof text === "string" && text.trim()) {
      result[key] = text.trim();
    }
  }

  return Object.keys(result).length ? result : undefined;
}

export function computeEvalScores(llmOutput: Record<string, unknown>): EvalScores | undefined {
  const raw =
    llmOutput.evalScores && typeof llmOutput.evalScores === "object"
      ? (llmOutput.evalScores as Record<string, unknown>)
      : undefined;

  if (!raw) return undefined;

  const values = DIMENSIONS.map((key) => {
    const v = Number(raw[key]);
    return Number.isFinite(v) ? fromLegacyPercent(v) : undefined;
  });

  if (values.some((v) => v === undefined)) return undefined;

  const notes =
    typeof raw.notes === "string"
      ? raw.notes.trim()
      : typeof llmOutput.notes === "string"
        ? llmOutput.notes.trim()
        : undefined;

  return {
    grounding: values[0]!,
    voice: values[1]!,
    expertiseLens: values[2]!,
    nonObviousness: values[3]!,
    justifications: readJustifications(raw),
    ...(notes ? { notes } : {}),
  };
}

export function formatEvalDimensionLabel(key: EvalDimension): string {
  const labels: Record<EvalDimension, string> = {
    grounding: "Grounding",
    voice: "Voice",
    expertiseLens: "Expertise",
    nonObviousness: "Non-obvious",
  };
  return labels[key];
}
