import type { EvalScores, EventSession, SessionStage, TrustLevel } from "../models/types.js";
import { buildWorkflowPrompt, type WorkflowName } from "./prompts.js";
import { callLlm, isLlmConfigured, parseJsonFromLlm } from "./llm.js";
import { normalizeClaims } from "./claims.js";
import { finalizeDraftWorkflowOutput } from "./content-drafts.js";
import { computeEvalScores } from "./eval-scores.js";
import { mergeSessionUpdate, applyStageCompletion } from "./complete.js";
import { canPerformAction, getLevelDefinition } from "../trust/levels.js";
import { loadProgress, saveProgress, saveSession, loadProfileOrExample } from "./storage.js";
import { captureInputFingerprint } from "./notes-fingerprint.js";

const WORKFLOW_ACTIONS: Record<WorkflowName, string> = {
  "organize-transcript": "run_extract",
  extract: "run_extract",
  synthesize: "run_synthesize",
  draft: "generate_content_drafts",
  "self-critique": "self_critique",
};

const WORKFLOW_STAGES: Partial<Record<WorkflowName, SessionStage>> = {
  extract: "extracted",
  synthesize: "synthesized",
  draft: "drafted",
  "self-critique": "reviewed",
};

const MIN_STAGE: Partial<Record<WorkflowName, SessionStage>> = {
  synthesize: "extracted",
  draft: "synthesized",
  "self-critique": "drafted",
};

const MIN_STAGE_MESSAGES: Partial<Record<WorkflowName, string>> = {
  synthesize: "Run Remember first — extract people and claims from your notes.",
  draft: "Run Think first — connect learnings to your lens.",
  "self-critique": "Run Create first — generate drafts to review.",
};

const STAGE_ORDER: SessionStage[] = [
  "ingested",
  "extracted",
  "synthesized",
  "drafted",
  "reviewed",
  "published",
];

export type RunnableWorkflow = "organize-transcript" | "extract" | "synthesize" | "draft" | "self-critique";

export interface WorkflowRunOptions {
  selectedThemeIds?: string[];
}

function stageIndex(stage: SessionStage): number {
  return STAGE_ORDER.indexOf(stage);
}

function assertMinStage(session: EventSession, workflow: RunnableWorkflow): void {
  const required = MIN_STAGE[workflow];
  if (!required) return;
  if (stageIndex(session.stage) < stageIndex(required)) {
    throw new Error(MIN_STAGE_MESSAGES[workflow] ?? "Complete the prior step before running this workflow.");
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeWorkflowUpdate(
  workflow: RunnableWorkflow,
  session: EventSession,
  update: Partial<EventSession>
): Partial<EventSession> {
  if (workflow === "extract") {
    const people = asArray<EventSession["people"][number]>(update.people)
      .filter((p) => p && String(p.name ?? "").trim())
      .map((p, i) => ({
        ...p,
        id: p.id || `person-${i + 1}`,
        name: String(p.name).trim(),
        role: p.role ?? "unknown",
        metInPerson: Boolean(p.metInPerson),
      }));

    const claims = normalizeClaims(update.claims as unknown[] | undefined);

    const themes = asArray<EventSession["themes"][number]>(update.themes)
      .filter((t) => t && String(t.label ?? "").trim())
      .map((t, i) => ({
        ...t,
        id: t.id || `theme-${i + 1}`,
        label: String(t.label).trim(),
        claimIds: Array.isArray(t.claimIds) ? t.claimIds : [],
      }));

    return { ...update, people, claims, themes };
  }

  if (workflow === "draft") {
    const finalized = finalizeDraftWorkflowOutput(session, update);
    delete finalized.evalScores;
    return finalized;
  }

  if (workflow === "self-critique") {
    return {};
  }

  return update;
}

function appendCritiqueNotes(
  evalScores: EvalScores | undefined,
  parsed: Record<string, unknown>
): EvalScores | undefined {
  if (!evalScores) return undefined;

  const edits = parsed.suggestedEdits;
  const sentences = parsed.sentencesToRevise;
  if (!Array.isArray(edits) && !Array.isArray(sentences)) return evalScores;

  const parts: string[] = [];
  if (Array.isArray(edits) && edits.length) {
    parts.push("Suggested edits:\n" + edits.map((e) => `- ${String(e)}`).join("\n"));
  }
  if (Array.isArray(sentences) && sentences.length) {
    parts.push("Sentences to revise:\n" + sentences.map((s) => `- ${String(s)}`).join("\n"));
  }

  return {
    ...evalScores,
    notes: [evalScores.notes, parts.join("\n\n")].filter(Boolean).join("\n\n"),
  };
}

function hasCaptureInput(session: EventSession): boolean {
  return Boolean(
    session.rawNotes?.trim() ||
      session.eventTranscript?.trim() ||
      session.organizedNotes?.trim()
  );
}

export async function runSessionWorkflow(
  workflow: RunnableWorkflow,
  session: EventSession,
  userId: string,
  options: WorkflowRunOptions = {}
): Promise<{ session: EventSession; xpAwarded: number; leveledUp: boolean }> {
  if (!isLlmConfigured()) {
    throw new Error("LLM is not configured. Set OPENAI_API_KEY on the server.");
  }

  if (workflow === "organize-transcript" && !session.eventTranscript?.trim()) {
    throw new Error("Paste a transcript before organizing.");
  }

  if (workflow === "extract" && !hasCaptureInput(session)) {
    throw new Error("Add notes or a transcript before running Remember.");
  }

  if (workflow === "draft" && !(session.themes ?? []).some((t) => t.label?.trim())) {
    throw new Error("Run Think first — save at least one theme before generating LinkedIn drafts.");
  }

  if (workflow === "draft") {
    const themeIds = options.selectedThemeIds?.length
      ? options.selectedThemeIds
      : session.selectedThemeIds;
    let resolvedIds = themeIds;
    if (!resolvedIds?.length) {
      resolvedIds = (session.themes ?? [])
        .filter((t) => t.label?.trim())
        .slice(0, 2)
        .map((t) => t.id);
    }
    if (!resolvedIds?.length) {
      throw new Error("Run Think first — save at least one theme before generating LinkedIn drafts.");
    }
    session = { ...session, selectedThemeIds: resolvedIds };
  }

  if (workflow === "self-critique" && !session.contentDrafts?.length) {
    throw new Error("Run Create first — no drafts to review yet.");
  }

  assertMinStage(session, workflow);

  const progress = await loadProgress(userId);
  const userLevel = progress.level as TrustLevel;
  const action = WORKFLOW_ACTIONS[workflow];
  const gate = canPerformAction(userLevel, action);

  if (!gate.allowed) {
    const def = gate.requiredLevel !== undefined ? getLevelDefinition(gate.requiredLevel) : null;
    throw new Error(
      def
        ? `Unlock ${def.name} (Level ${gate.requiredLevel}) to run this step — keep using the loop to earn XP.`
        : "This workflow is locked at your current trust level."
    );
  }

  const profile = workflow === "organize-transcript" ? null : await loadProfileOrExample(userId);
  const bundle = await buildWorkflowPrompt(workflow, session, profile, userLevel);

  const userPrompt = [
    bundle.userContext,
    "",
    "## Output schema",
    bundle.outputSchema,
    "",
    "## Instructions",
    "Return only valid JSON matching the output schema. Do not wrap in markdown.",
    bundle.reasoningInstructions,
  ].join("\n");

  const raw = await callLlm(bundle.systemPrompt, userPrompt);
  const parsed = parseJsonFromLlm(raw) as Record<string, unknown>;
  let update = normalizeWorkflowUpdate(workflow, session, parsed as Partial<EventSession>);

  if (workflow === "self-critique") {
    const evalScores = appendCritiqueNotes(computeEvalScores(parsed), parsed);
    if (!evalScores) {
      throw new Error("Review could not produce evaluation scores — try again.");
    }
    update = { evalScores };
  }

  const { stage: _ignored, ...updateWithoutStage } = update;

  let merged = mergeSessionUpdate(session, updateWithoutStage);

  if (workflow === "organize-transcript") {
    const organizedNotes = String(parsed.organizedNotes ?? "").trim();
    if (!organizedNotes) {
      throw new Error("Could not organize transcript — try again with a longer paste.");
    }
    merged = { ...merged, organizedNotes };
    const saved = { ...merged, userId };
    await saveSession(saved, userId);
    return { session: saved, xpAwarded: 0, leveledUp: false };
  }

  if (workflow === "extract") {
    merged = {
      ...merged,
      extractedNotesFingerprint: captureInputFingerprint(merged),
    };
  }
  const targetStage = WORKFLOW_STAGES[workflow];
  if (!targetStage) {
    throw new Error(`Unknown workflow stage for ${workflow}`);
  }

  const result = applyStageCompletion(merged, progress, targetStage);
  const saved = { ...result.session, userId };
  await saveSession(saved, userId);
  await saveProgress(result.progress, userId);

  return {
    session: saved,
    xpAwarded: result.xpAwarded,
    leveledUp: result.leveledUp,
  };
}
