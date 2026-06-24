import type { EventSession, SessionStage, TrustLevel } from "../models/types.js";
import { buildWorkflowPrompt, type WorkflowName } from "./prompts.js";
import { callLlm, isLlmConfigured, parseJsonFromLlm } from "./llm.js";
import { mergeSessionUpdate, applyStageCompletion } from "./complete.js";
import { canPerformAction, getLevelDefinition } from "../trust/levels.js";
import { loadProgress, saveProgress, saveSession, loadProfileOrExample } from "./storage.js";

const WORKFLOW_ACTIONS: Record<WorkflowName, string> = {
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

export type RunnableWorkflow = "extract" | "synthesize" | "draft" | "self-critique";

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

function claimTextFromRaw(raw: Record<string, unknown>): string {
  const value =
    raw.text ??
    raw.statement ??
    raw.content ??
    raw.claim ??
    raw.description ??
    raw.summary ??
    "";
  return String(value).trim();
}

function normalizeWorkflowUpdate(
  workflow: RunnableWorkflow,
  update: Partial<EventSession>
): Partial<EventSession> {
  if (workflow !== "extract") return update;

  const people = (update.people ?? [])
    .filter((p) => p && String(p.name ?? "").trim())
    .map((p, i) => ({
      ...p,
      id: p.id || `person-${i + 1}`,
      name: String(p.name).trim(),
      role: p.role ?? "unknown",
      metInPerson: Boolean(p.metInPerson),
    }));

  const claims = (update.claims ?? [])
    .map((c, i) => {
      const raw = c as unknown as Record<string, unknown>;
      const text = claimTextFromRaw(raw);
      if (!text) return null;
      return {
        ...c,
        id: c.id || `claim-${i + 1}`,
        text,
        confidence: c.confidence ?? "medium",
        sources: Array.isArray(c.sources) ? c.sources : [],
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const themes = (update.themes ?? [])
    .filter((t) => t && String(t.label ?? "").trim())
    .map((t, i) => ({
      ...t,
      id: t.id || `theme-${i + 1}`,
      label: String(t.label).trim(),
      claimIds: Array.isArray(t.claimIds) ? t.claimIds : [],
    }));

  return { ...update, people, claims, themes };
}

function mergeCritiqueExtras(
  session: EventSession,
  update: Record<string, unknown>
): Partial<EventSession> {
  const merged = { ...(update as Partial<EventSession>) };
  const edits = update.suggestedEdits;
  const sentences = update.sentencesToRevise;
  if (!Array.isArray(edits) && !Array.isArray(sentences)) return merged;

  const parts: string[] = [];
  if (Array.isArray(edits) && edits.length) {
    parts.push("Suggested edits:\n" + edits.map((e) => `- ${String(e)}`).join("\n"));
  }
  if (Array.isArray(sentences) && sentences.length) {
    parts.push("Sentences to revise:\n" + sentences.map((s) => `- ${String(s)}`).join("\n"));
  }
  if (parts.length && merged.evalScores) {
    merged.evalScores = {
      ...merged.evalScores,
      notes: [merged.evalScores.notes, parts.join("\n\n")].filter(Boolean).join("\n\n"),
    };
  }
  return merged;
}

export async function runSessionWorkflow(
  workflow: RunnableWorkflow,
  session: EventSession,
  userId: string
): Promise<{ session: EventSession; xpAwarded: number; leveledUp: boolean }> {
  if (!isLlmConfigured()) {
    throw new Error("LLM is not configured. Set OPENAI_API_KEY on the server.");
  }

  if (workflow === "extract" && !session.rawNotes?.trim()) {
    throw new Error("Add notes before running Remember.");
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

  const profile = workflow === "extract" ? null : await loadProfileOrExample(userId);
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
  const parsed = parseJsonFromLlm(raw);
  const critiqueMerged = workflow === "self-critique" ? mergeCritiqueExtras(session, parsed) : parsed;
  const update = normalizeWorkflowUpdate(workflow, critiqueMerged as Partial<EventSession>);
  const { stage: _ignored, ...updateWithoutStage } = update;

  const merged = mergeSessionUpdate(session, updateWithoutStage);
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
