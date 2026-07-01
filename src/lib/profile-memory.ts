import type { EvalScores, EventSession, ExpertiseProfile, ProfileLearning } from "../models/types.js";
import { formatEvalDimensionLabel, type EvalDimension } from "./eval-scores.js";

const MAX_LEARNINGS = 25;
const MAX_POST_EXAMPLES = 10;

const HYPE_PHRASES = [
  "synergy",
  "synergies",
  "leverage",
  "circle back",
  "excited to announce",
  "thrilled to",
  "humbled to",
  "game-changer",
  "paradigm",
];

function learningId(): string {
  return `learn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isPlaceholderExample(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.startsWith("paste your best") || t.startsWith("example structure:");
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function excerpt(text: string, max = 120): string {
  const flat = text.trim().replace(/\s+/g, " ");
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function findRemovedHype(removedSentences: string[]): string | null {
  for (const sentence of removedSentences) {
    const lower = sentence.toLowerCase();
    for (const phrase of HYPE_PHRASES) {
      if (lower.includes(phrase)) return excerpt(sentence, 100);
    }
  }
  return null;
}

function summarizeDraftEdit(
  aiBody: string,
  userBody: string,
  platform: string,
  eventTitle: string
): Pick<ProfileLearning, "summary" | "instruction" | "reason"> {
  const ai = aiBody.trim();
  const user = userBody.trim();
  const aiSentences = splitSentences(ai);
  const userSentences = splitSentences(user);

  const removed = aiSentences.filter(
    (s) => !user.toLowerCase().includes(s.slice(0, Math.min(40, s.length)).toLowerCase())
  );
  const added = userSentences.filter(
    (s) => !ai.toLowerCase().includes(s.slice(0, Math.min(40, s.length)).toLowerCase())
  );

  const reasons: string[] = [];
  const rules: string[] = [];

  if (user.length < ai.length * 0.88) {
    const pct = Math.round((1 - user.length / ai.length) * 100);
    rules.push(`Keep ${platform} drafts shorter — you cut about ${pct}% of the AI version`);
    reasons.push(`You shortened the draft (${ai.length} → ${user.length} characters).`);
  }

  const hypeRemoved = findRemovedHype(removed);
  if (hypeRemoved) {
    rules.push("Drop corporate networking language you deleted from AI drafts");
    reasons.push(`You removed hype phrasing like: "${hypeRemoved}"`);
  }

  if (removed.length > 0 && !hypeRemoved) {
    rules.push("Don't reuse opening lines the AI wrote that you deleted");
    reasons.push(`You cut AI wording: "${excerpt(removed[0], 100)}"`);
  }

  if (added.length > 0) {
    rules.push("Open and frame posts more like your rewritten lines");
    reasons.push(`You wrote: "${excerpt(added[0], 120)}"`);
  }

  if (!rules.length) {
    rules.push(`Match the voice of your edited ${platform} post`);
    reasons.push("You rewrote meaningful portions of the AI draft.");
  }

  const summary = rules[0];
  const instruction = [
    ...rules,
    `Your approved ${platform} edit from "${eventTitle}" is the voice reference for future drafts.`,
  ].join(" ");

  return {
    summary,
    instruction: instruction.slice(0, 400),
    reason: reasons.join(" "),
  };
}

export function normalizeProfileMemory(profile: ExpertiseProfile): ExpertiseProfile {
  const learnings = (profile.learnings ?? []).map((l) => ({
    ...l,
    summary: l.summary?.trim() || legacyLearningSummary(l),
  }));
  return { ...profile, learnings };
}

/** Backfill display text for learnings saved before summary existed. */
export function legacyLearningSummary(learning: ProfileLearning): string {
  if (learning.summary?.trim()) return learning.summary.trim();
  const text = learning.instruction.trim();
  if (text.length <= 100) return text;
  return text.slice(0, 97) + "…";
}

export interface SessionEditFlags {
  think?: boolean;
  create?: boolean;
}

export function captureLearningsFromSessionEdit(
  before: EventSession,
  after: EventSession,
  flags: SessionEditFlags
): Partial<ExpertiseProfile> {
  const newLearnings: ProfileLearning[] = [];
  const newExamples: string[] = [];
  const createdAt = new Date().toISOString();

  if (flags.think && after.matteredLine?.trim()) {
    const prev = before.matteredLine?.trim() ?? "";
    const next = after.matteredLine.trim();
    if (next && next !== prev) {
      newLearnings.push({
        id: learningId(),
        summary: "Frame what mattered in your own words",
        instruction: `When summarizing what mattered, prefer this framing: ${next.slice(0, 280)}`,
        reason: `You rewrote "what mattered" to: "${excerpt(next, 160)}"`,
        source: "think_edit",
        sessionId: after.id,
        sessionTitle: after.title,
        createdAt,
      });
    }
  }

  if (flags.create && after.contentDrafts?.length) {
    const beforeDrafts = new Map((before.contentDrafts ?? []).map((d) => [d.id, d]));
    for (const draft of after.contentDrafts) {
      const prev = beforeDrafts.get(draft.id);
      if (!prev || prev.body.trim() === draft.body.trim()) continue;
      const userBody = draft.body.trim();
      if (userBody.length < 40) continue;

      const analyzed = summarizeDraftEdit(prev.body, userBody, draft.platform, after.title);
      newExamples.push(userBody.slice(0, 500));
      newLearnings.push({
        id: learningId(),
        ...analyzed,
        source: "draft_edit",
        sessionId: after.id,
        sessionTitle: after.title,
        createdAt,
      });
    }
  }

  const updates: Partial<ExpertiseProfile> = {};
  if (newLearnings.length) updates.learnings = newLearnings;
  if (newExamples.length) updates.pastPostExamples = newExamples;
  return updates;
}

const EVAL_DIMENSIONS: EvalDimension[] = [
  "grounding",
  "voice",
  "expertiseLens",
  "nonObviousness",
];

export function mergeEvalScores(
  existing: EvalScores | undefined,
  humanOverride: NonNullable<EvalScores["humanOverride"]>
): EvalScores | undefined {
  if (!existing) return undefined;
  return {
    ...existing,
    humanOverride: { ...existing.humanOverride, ...humanOverride },
    calibratedAt: new Date().toISOString(),
  };
}

export function captureLearningsFromEvalOverride(
  before: EvalScores,
  after: EvalScores,
  session: EventSession
): ProfileLearning[] {
  const learnings: ProfileLearning[] = [];
  const override = after.humanOverride ?? {};
  const createdAt = new Date().toISOString();

  for (const key of EVAL_DIMENSIONS) {
    const userScore = override[key];
    if (userScore === undefined) continue;
    const aiScore = before[key];
    if (userScore >= aiScore) continue;

    const label = formatEvalDimensionLabel(key);
    const justification = after.justifications?.[key] ?? before.justifications?.[key];
    const summary = `${label} was off — you scored ${userScore}/5 (AI said ${aiScore}/5)`;
    const instruction = justification
      ? `Improve ${label.toLowerCase()}: ${justification}`
      : `Improve ${label.toLowerCase()} on drafts — you rated ${userScore}/5 but AI self-scored ${aiScore}/5`;
    const reason = justification
      ? `Review note: ${justification}`
      : `You corrected the ${label.toLowerCase()} score down from ${aiScore} to ${userScore}.`;

    learnings.push({
      id: learningId(),
      summary,
      instruction: instruction.slice(0, 320),
      reason,
      source: "eval_feedback",
      sessionId: session.id,
      sessionTitle: session.title,
      createdAt,
    });
  }

  return learnings;
}

export function deleteProfileLearning(
  profile: ExpertiseProfile,
  learningId: string
): ExpertiseProfile {
  const base = normalizeProfileMemory(profile);
  return {
    ...base,
    learnings: (base.learnings ?? []).filter((l) => l.id !== learningId),
  };
}

export function mergeProfileMemory(
  profile: ExpertiseProfile,
  captured: Partial<ExpertiseProfile>
): ExpertiseProfile {
  const base = normalizeProfileMemory(profile);

  let learnings = [...(base.learnings ?? [])];
  for (const item of captured.learnings ?? []) {
    if (!learnings.some((l) => l.summary === item.summary && l.sessionId === item.sessionId)) {
      learnings.push(item);
    }
  }
  learnings = learnings.slice(-MAX_LEARNINGS);

  let examples = [...(base.pastPostExamples ?? [])].filter((e) => !isPlaceholderExample(e));
  for (const ex of captured.pastPostExamples ?? []) {
    if (!examples.some((e) => e.trim() === ex.trim())) {
      examples.unshift(ex);
    }
  }
  examples = examples.slice(0, MAX_POST_EXAMPLES);

  return { ...base, learnings, pastPostExamples: examples };
}

export function formatLearningsForPrompt(profile: ExpertiseProfile): string {
  const learnings = normalizeProfileMemory(profile).learnings ?? [];
  if (!learnings.length) return "";

  const recent = learnings.slice(-8);
  const lines = recent.map((l) => `- ${l.instruction}`);
  return [
    "## Learned from your past edits",
    "Apply these unless the current event clearly contradicts them:",
    ...lines,
  ].join("\n");
}
