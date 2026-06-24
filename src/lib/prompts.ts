import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EventSession, ExpertiseProfile, TrustLevel } from "../models/types.js";
import { canPerformAction } from "../trust/levels.js";
import { loadResume } from "./storage.js";

const WORKFLOWS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "workflows");

export type WorkflowName = "extract" | "synthesize" | "draft" | "self-critique";

const WORKFLOW_FILES: Record<WorkflowName, string> = {
  extract: "01-extract.md",
  synthesize: "02-synthesize.md",
  draft: "03-draft.md",
  "self-critique": "04-self-critique.md",
};

const STAGE_REQUIREMENTS: Record<WorkflowName, { action: string; minStage?: string }> = {
  extract: { action: "run_extract" },
  synthesize: { action: "run_synthesize", minStage: "extracted" },
  draft: { action: "generate_content_drafts", minStage: "synthesized" },
  "self-critique": { action: "self_critique", minStage: "drafted" },
};

export interface PromptBundle {
  workflow: WorkflowName;
  systemPrompt: string;
  userContext: string;
  outputSchema: string;
  reasoningInstructions: string;
}

function formatProfile(profile: ExpertiseProfile): string {
  return JSON.stringify(profile, null, 2);
}

function formatSessionContext(session: EventSession, workflow: WorkflowName): string {
  const eventPageContext = session.eventEnrichment
    ? {
        title: session.eventEnrichment.title,
        description: session.eventEnrichment.description,
        topics: session.eventEnrichment.topics,
        hosts: session.eventEnrichment.speakers.filter((s) => s.role === "host"),
        speakers:
          workflow === "extract"
            ? session.eventEnrichment.speakers.filter((s) => s.role !== "host")
            : undefined,
        attendeeCount: session.eventEnrichment.attendeeCount,
      }
    : undefined;

  const payload: Record<string, unknown> = {
    id: session.id,
    title: session.title,
    eventType: session.eventType,
    eventUrl: session.eventUrl,
    location: session.location,
    attendanceIntent: session.attendanceIntent,
    eventPageContext: session.eventEnrichment
      ? eventPageContext
      : undefined,
    rawNotes: session.rawNotes,
    screenshotDescriptions: session.screenshotDescriptions,
    people: session.people,
    interactions: session.interactions,
    claims: session.claims,
    themes: session.themes,
    assumptionChallenges: session.assumptionChallenges,
    contentAngles: session.contentAngles,
  };

  if (workflow === "draft" || workflow === "self-critique") {
    payload.contentDrafts = session.contentDrafts;
    payload.followUpDrafts = session.followUpDrafts;
  }
  if (workflow === "self-critique") {
    payload.evalScores = session.evalScores;
  }

  return JSON.stringify(payload, null, 2);
}

export async function buildWorkflowPrompt(
  workflow: WorkflowName,
  session: EventSession,
  profile: ExpertiseProfile | null,
  userLevel: TrustLevel
): Promise<PromptBundle> {
  const req = STAGE_REQUIREMENTS[workflow];
  const gate = canPerformAction(userLevel, req.action);

  if (!gate.allowed) {
    throw new Error(
      `Action "${req.action}" requires Level ${gate.requiredLevel}. You are Level ${userLevel}.`
    );
  }

  if (workflow !== "extract" && !profile) {
    throw new Error(
      "Profile required. Copy profile/profile.example.json to profile/profile.json and customize."
    );
  }

  const template = await readFile(join(WORKFLOWS_DIR, WORKFLOW_FILES[workflow]), "utf-8");
  const resume = profile && workflow !== "extract" ? await loadResume() : null;
  const rubric =
    workflow === "self-critique"
      ? await readFile(
          join(dirname(fileURLToPath(import.meta.url)), "..", "..", "eval", "rubrics", "scorecard.json"),
          "utf-8"
        )
      : null;

  const userContext = [
    "## Event session",
    formatSessionContext(session, workflow),
    profile ? "\n## Expertise profile\n" + formatProfile(profile) : "",
    resume ? "\n## Resume (professional context)\n" + resume : "",
    rubric ? "\n## Eval rubrics\n" + rubric : "",
  ].join("\n");

  const parts = template.split("---");
  const systemPrompt = parts[0]?.trim() ?? template;
  const outputSchema = parts[1]?.trim() ?? "Return structured JSON matching session schema fields.";
  const reasoningInstructions =
    parts[2]?.trim() ??
    "Show your reasoning trace: sources → claims → insights → drafts.";

  return {
    workflow,
    systemPrompt,
    userContext,
    outputSchema,
    reasoningInstructions,
  };
}

export function renderPromptForCursor(bundle: PromptBundle): string {
  return [
    bundle.systemPrompt,
    "",
    "---",
    "",
    bundle.userContext,
    "",
    "---",
    "",
    "## Output schema",
    bundle.outputSchema,
    "",
    "## Reasoning (required — show before final output)",
    bundle.reasoningInstructions,
  ].join("\n");
}
