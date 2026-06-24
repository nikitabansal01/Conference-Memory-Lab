import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Claim, EvalScores, EventSession, ExpertiseProfile } from "../models/types.js";
import { claimTextFromRaw } from "./claims.js";

const DIMENSIONS = ["grounding", "voice", "expertiseLens", "nonObviousness"] as const;
export type EvalDimension = (typeof DIMENSIONS)[number];

const BANDS: Record<EvalDimension, Record<string, [number, number]>> = {
  grounding: {
    "90-100": [90, 100],
    "70-89": [70, 89],
    "50-69": [50, 69],
    "0-49": [0, 49],
  },
  voice: {
    "90-100": [90, 100],
    "70-89": [70, 89],
    "50-69": [50, 69],
    "0-49": [0, 49],
  },
  expertiseLens: {
    "90-100": [90, 100],
    "75-89": [75, 89],
    "50-74": [50, 74],
    "0-49": [0, 49],
  },
  nonObviousness: {
    "88-100": [88, 100],
    "65-87": [65, 87],
    "40-64": [40, 64],
    "0-39": [0, 39],
  },
};

const RECAP_PHRASES = [
  "i attended",
  "great event",
  "excited to share",
  "had the pleasure",
  "wonderful evening",
  "thanks to everyone",
  "key takeaways from",
];

const AI_TELL_PHRASES = [
  "in today's rapidly",
  "game-changer",
  "delighted to announce",
  "excited to announce",
  "thrilled to",
  "synergy",
  "leverage",
  "circle back",
];

export interface ContentSignal {
  strength: number;
  detail: string;
}

export interface DimensionRubricInput {
  band?: string;
  justification?: string;
  unsupportedStatements?: number;
  aiTells?: string[];
  citedClaimIds?: string[];
}

function clamp(n: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, n));
}

function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)));
}

function claimText(claim: Claim): string {
  return claimTextFromRaw(claim) || String(claim.text ?? "").trim();
}

function collectDraftBodies(session: EventSession): string[] {
  return (session.contentDrafts ?? [])
    .map((d) => String(d.body ?? "").trim())
    .filter(Boolean);
}

function draftCorpus(session: EventSession): string {
  return collectDraftBodies(session).join("\n\n").toLowerCase();
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

function overlapRatio(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const w of ta) {
    if (tb.has(w)) shared++;
  }
  return shared / Math.min(ta.size, tb.size);
}

function claimReferencedInDraft(claim: Claim, corpus: string): boolean {
  const text = claimText(claim);
  if (!text) return false;
  if (corpus.includes(text.toLowerCase().slice(0, 48))) return true;
  return overlapRatio(text, corpus) >= 0.35;
}

export function measureGrounding(session: EventSession): ContentSignal {
  const corpus = draftCorpus(session);
  const claims = session.claims ?? [];
  const drafts = collectDraftBodies(session);

  if (!drafts.length) {
    return { strength: 0.2, detail: "No draft text to check against claims" };
  }
  if (!claims.length) {
    return { strength: 0.45, detail: "No extracted claims to verify grounding" };
  }

  const referenced = claims.filter((c) => claimReferencedInDraft(c, corpus));
  const ratio = referenced.length / claims.length;
  const citedFromAngles = new Set(
    (session.contentAngles ?? []).flatMap((a) => a.claimIds ?? [])
  );
  const angleBonus = citedFromAngles.size > 0 ? 0.08 : 0;

  return {
    strength: clamp(ratio * 0.85 + angleBonus + (drafts.some((d) => d.length > 120) ? 0.05 : 0)),
    detail: `${referenced.length}/${claims.length} claims reflected in draft`,
  };
}

export function measureNonObviousness(session: EventSession): ContentSignal {
  const corpus = draftCorpus(session);
  if (!corpus) {
    return { strength: 0.2, detail: "No draft to assess insight vs recap" };
  }

  const themes = session.themes ?? [];
  const angles = session.contentAngles ?? [];
  let themeHits = 0;
  for (const theme of themes) {
    if (theme.label && corpus.includes(theme.label.toLowerCase().slice(0, 24))) themeHits++;
    if (theme.profileConnection && overlapRatio(theme.profileConnection, corpus) >= 0.3) themeHits++;
  }
  for (const angle of angles) {
    if (angle.nonObviousInsight && overlapRatio(angle.nonObviousInsight, corpus) >= 0.25) themeHits++;
  }

  const recapHits = RECAP_PHRASES.filter((p) => corpus.includes(p)).length;
  const hasQuestion = corpus.includes("?");
  const challenges = session.assumptionChallenges?.length ?? 0;

  const strength = clamp(
    themeHits * 0.18 + (hasQuestion ? 0.12 : 0) + (challenges > 0 ? 0.08 : 0) - recapHits * 0.1
  );

  return {
    strength,
    detail:
      themeHits > 0
        ? `${themeHits} theme/angle insights present${recapHits ? ` · ${recapHits} recap phrase(s)` : ""}`
        : recapHits
          ? `${recapHits} generic recap phrase(s) detected`
          : "Limited theme linkage in draft",
  };
}

export function measureExpertiseLens(
  session: EventSession,
  profile: ExpertiseProfile | null
): ContentSignal {
  const corpus = draftCorpus(session);
  if (!corpus) {
    return { strength: 0.2, detail: "No draft to check expertise angle" };
  }

  const areas = [
    ...(profile?.expertiseAreas ?? []),
    ...(profile?.industries ?? []),
    ...(profile?.contentPriorities ?? []).slice(0, 3),
  ].filter(Boolean);

  if (!areas.length) {
    const themeConnections = (session.themes ?? []).filter((t) => t.profileConnection).length;
    return {
      strength: clamp(themeConnections * 0.2 + 0.25),
      detail:
        themeConnections > 0
          ? `${themeConnections} Think theme connection(s) in session`
          : "Complete Unique Lens for expertise scoring",
    };
  }

  const hits = areas.filter((area) => {
    const fragment = area.toLowerCase().slice(0, 20);
    return corpus.includes(fragment) || overlapRatio(area, corpus) >= 0.25;
  });

  const angleLens = (session.contentAngles ?? []).some((a) => (a.expertiseLens ?? []).length > 0);

  return {
    strength: clamp(hits.length / Math.min(areas.length, 5) + (angleLens ? 0.1 : 0)),
    detail:
      hits.length > 0
        ? `${hits.length} expertise area(s) visible in draft`
        : "Expertise areas not yet visible in draft",
  };
}

export function measureVoice(session: EventSession, profile: ExpertiseProfile | null): ContentSignal {
  const corpus = draftCorpus(session);
  if (!corpus) {
    return { strength: 0.2, detail: "No draft for voice check" };
  }

  let strength = 0.72;
  const issues: string[] = [];

  const emojiPattern = /[\u{1F300}-\u{1FAFF}]/u;
  if (emojiPattern.test(corpus)) {
    strength -= 0.25;
    issues.push("emoji detected");
  }

  const avoid = profile?.avoidPatterns ?? [];
  for (const pattern of avoid) {
    const p = pattern.toLowerCase();
    if (p.includes("emoji")) continue;
    if (p.length > 8 && corpus.includes(p.slice(0, 24))) {
      strength -= 0.08;
      issues.push("matches avoid pattern");
      break;
    }
  }

  const aiTells = AI_TELL_PHRASES.filter((p) => corpus.includes(p));
  strength -= aiTells.length * 0.1;
  if (aiTells.length) issues.push(`${aiTells.length} AI tell phrase(s)`);

  const examples = (profile?.pastPostExamples ?? []).filter(
    (p) => p.trim() && !p.toLowerCase().includes("paste")
  );
  if (examples.length) {
    const overlaps = examples.map((ex) => overlapRatio(ex, corpus));
    const avgOverlap = overlaps.reduce((a, b) => a + b, 0) / overlaps.length;
    strength = strength * 0.55 + avgOverlap * 0.45;
  }

  return {
    strength: clamp(strength),
    detail: issues.length ? issues.join(" · ") : "No major voice flags in draft text",
  };
}

function normalizeBand(dim: EvalDimension, raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/\s+/g, "");
  const bands = BANDS[dim];
  if (bands[cleaned]) return cleaned;
  for (const key of Object.keys(bands)) {
    if (cleaned.includes(key.replace("-", ""))) return key;
  }
  return undefined;
}

function inferBandFromScore(dim: EvalDimension, score: number): string {
  const entries = Object.entries(BANDS[dim]).sort((a, b) => b[1][0] - a[1][0]);
  for (const [band, [lo]] of entries) {
    if (score >= lo) return band;
  }
  return entries[entries.length - 1]?.[0] ?? "0-49";
}

function scoreInBand(dim: EvalDimension, band: string, strength: number): number {
  const [lo, hi] = BANDS[dim][band] ?? [65, 75];
  return clampScore(lo + clamp(strength) * (hi - lo));
}

function readDimensionRubric(
  dim: EvalDimension,
  rubricRoot: Record<string, unknown> | undefined,
  legacyRoot: Record<string, unknown> | undefined
): DimensionRubricInput {
  const entry = rubricRoot?.[dim];
  const record =
    entry && typeof entry === "object" ? (entry as Record<string, unknown>) : undefined;

  const band =
    normalizeBand(dim, typeof record?.band === "string" ? record.band : undefined) ??
    (typeof legacyRoot?.[`${dim}Band`] === "string"
      ? normalizeBand(dim, legacyRoot[`${dim}Band`] as string)
      : undefined);

  const justification =
    (typeof record?.justification === "string" && record.justification.trim()) ||
    (typeof legacyRoot?.justifications === "object" &&
    legacyRoot.justifications &&
    typeof (legacyRoot.justifications as Record<string, unknown>)[dim] === "string"
      ? String((legacyRoot.justifications as Record<string, unknown>)[dim])
      : undefined);

  const unsupportedStatements = Number(record?.unsupportedStatements);
  const aiTells = Array.isArray(record?.aiTells) ? record.aiTells.map(String) : undefined;
  const citedClaimIds = Array.isArray(record?.citedClaimIds)
    ? record.citedClaimIds.map(String)
    : undefined;

  return {
    band,
    justification,
    unsupportedStatements: Number.isFinite(unsupportedStatements) ? unsupportedStatements : undefined,
    aiTells,
    citedClaimIds,
  };
}

function applyRubricAdjustments(
  dim: EvalDimension,
  strength: number,
  rubric: DimensionRubricInput
): number {
  let adjusted = strength;

  if (dim === "grounding" && rubric.unsupportedStatements) {
    adjusted -= rubric.unsupportedStatements * 0.12;
  }
  if (dim === "voice" && rubric.aiTells?.length) {
    adjusted -= rubric.aiTells.length * 0.08;
  }
  if (dim === "grounding" && rubric.citedClaimIds?.length) {
    adjusted += Math.min(0.15, rubric.citedClaimIds.length * 0.03);
  }

  return clamp(adjusted);
}

function buildJustification(rubric: DimensionRubricInput, signal: ContentSignal, score: number): string {
  const parts = [
    rubric.justification,
    signal.detail,
    rubric.unsupportedStatements
      ? `${rubric.unsupportedStatements} unsupported statement(s) noted`
      : "",
  ].filter(Boolean);
  return parts.join(" · ") || `Calibrated to ${score}/100 from draft signals`;
}

function readLegacyScores(raw: Record<string, unknown>): number[] | undefined {
  const values = DIMENSIONS.map((key) => {
    const v = Number(raw[key]);
    return Number.isFinite(v) ? v : undefined;
  });
  if (values.some((v) => v === undefined)) return undefined;
  return values as number[];
}

function looksLikeLikert(values: number[]): boolean {
  return values.every((v) => Number.isInteger(v) && v >= 1 && v <= 5);
}

function likertToBand(dim: EvalDimension, value: number): string {
  const map: Record<number, string> = {
    5: dim === "nonObviousness" ? "88-100" : "90-100",
    4: dim === "expertiseLens" ? "75-89" : dim === "nonObviousness" ? "65-87" : "70-89",
    3: dim === "expertiseLens" ? "50-74" : dim === "nonObviousness" ? "40-64" : "50-69",
    2: dim === "nonObviousness" ? "40-64" : "50-69",
    1: "0-49",
  };
  return map[value] ?? inferBandFromScore(dim, value * 20);
}

export function computeEvalScores(
  session: EventSession,
  profile: ExpertiseProfile | null,
  llmOutput: Record<string, unknown>
): EvalScores | undefined {
  const signals: Record<EvalDimension, ContentSignal> = {
    grounding: measureGrounding(session),
    voice: measureVoice(session, profile),
    expertiseLens: measureExpertiseLens(session, profile),
    nonObviousness: measureNonObviousness(session),
  };

  const rubricRoot =
    llmOutput.evalRubric && typeof llmOutput.evalRubric === "object"
      ? (llmOutput.evalRubric as Record<string, unknown>)
      : undefined;
  const legacyRoot =
    llmOutput.evalScores && typeof llmOutput.evalScores === "object"
      ? (llmOutput.evalScores as Record<string, unknown>)
      : undefined;

  const legacyValues = legacyRoot ? readLegacyScores(legacyRoot) : undefined;
  const useLikert = legacyValues ? looksLikeLikert(legacyValues) : false;

  const justifications: NonNullable<EvalScores["justifications"]> = {};
  const scores: Partial<Record<EvalDimension, number>> = {};

  DIMENSIONS.forEach((dim, i) => {
    const rubric = readDimensionRubric(dim, rubricRoot, legacyRoot);
    const signal = signals[dim];

    let band = rubric.band;
    if (!band && useLikert && legacyValues) {
      band = likertToBand(dim, legacyValues[i]);
    }
    if (!band && legacyValues && !useLikert && legacyValues[i] <= 100) {
      band = inferBandFromScore(dim, legacyValues[i]);
    }
    if (!band) {
      band = inferBandFromScore(dim, signal.strength * 100);
    }

    const adjustedStrength = applyRubricAdjustments(dim, signal.strength, rubric);
    let score = scoreInBand(dim, band, adjustedStrength);

    if (legacyValues && !useLikert && legacyValues[i] > 10 && legacyValues[i] <= 100) {
      const llmWeight = 0.45;
      score = clampScore(score * (1 - llmWeight) + legacyValues[i] * llmWeight);
    }

    scores[dim] = score;
    justifications[dim] = buildJustification(rubric, signal, score);
  });

  const notes =
    typeof legacyRoot?.notes === "string"
      ? legacyRoot.notes.trim()
      : typeof llmOutput.notes === "string"
        ? llmOutput.notes.trim()
        : "";

  const signalAvg = Math.round(
    (DIMENSIONS.reduce((sum, d) => sum + signals[d].strength, 0) / DIMENSIONS.length) * 100
  );

  const calibrationNote = `Scores blend rubric review with draft signals (material coverage ~${signalAvg}%).`;

  return {
    grounding: scores.grounding!,
    voice: scores.voice!,
    expertiseLens: scores.expertiseLens!,
    nonObviousness: scores.nonObviousness!,
    justifications,
    notes: [notes, calibrationNote].filter(Boolean).join("\n\n"),
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

let scorecardCache: string | null = null;

export async function loadScorecardJson(): Promise<string> {
  if (scorecardCache) return scorecardCache;
  scorecardCache = await readFile(
    join(dirname(fileURLToPath(import.meta.url)), "..", "..", "eval", "rubrics", "scorecard.json"),
    "utf-8"
  );
  return scorecardCache;
}
