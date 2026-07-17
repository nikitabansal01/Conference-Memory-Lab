import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EventSession, ExpertiseProfile, TrustLevel } from "../models/types.js";
import { canPerformAction } from "../trust/levels.js";
import { loadResume } from "./storage.js";
import { formatLearningsForPrompt } from "./profile-memory.js";

const WORKFLOWS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "workflows");

export type WorkflowName = "organize-transcript" | "extract" | "synthesize" | "draft" | "self-critique";

const WORKFLOW_FILES: Record<WorkflowName, string> = {
  "organize-transcript": "00-organize-transcript.md",
  extract: "01-extract.md",
  synthesize: "02-synthesize.md",
  draft: "03-draft.md",
  "self-critique": "04-self-critique.md",
};

const STAGE_REQUIREMENTS: Record<WorkflowName, { action: string; minStage?: string }> = {
  "organize-transcript": { action: "run_extract" },
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
    eventTranscript: session.eventTranscript,
    organizedNotes: session.organizedNotes,
    screenshotDescriptions: session.screenshotDescriptions,
    mediaCaptures: (session.captures ?? []).map((c) => ({
      kind: c.kind,
      originalName: c.originalName,
      caption: c.caption ?? null,
      // Images/audio/video bytes are not sent to the model — captions are.
    })),
    people: session.people,
    interactions: session.interactions,
    claims: session.claims,
    themes: session.themes,
    assumptionChallenges: session.assumptionChallenges,
    contentAngles: session.contentAngles,
    matteredLine: session.matteredLine,
  };

  if (workflow === "draft" || workflow === "self-critique") {
    payload.contentDrafts = session.contentDrafts;
    payload.followUpDrafts = session.followUpDrafts;
  }
  if (workflow === "draft" && session.selectedThemeIds?.length) {
    payload.selectedThemeIds = session.selectedThemeIds;
    payload.themes = (session.themes ?? []).filter((t) =>
      session.selectedThemeIds!.includes(t.id)
    );
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

  if (workflow !== "organize-transcript" && !profile) {
    throw new Error(
      "Profile required. Copy profile/profile.example.json to profile/profile.json and customize."
    );
  }

  const template = await readFile(join(WORKFLOWS_DIR, WORKFLOW_FILES[workflow]), "utf-8");
  const resume =
    profile && workflow !== "extract" && workflow !== "organize-transcript"
      ? await loadResume()
      : null;
  const rubric =
    workflow === "self-critique"
      ? await readFile(
          join(dirname(fileURLToPath(import.meta.url)), "..", "..", "eval", "rubrics", "scorecard.json"),
          "utf-8"
        )
      : null;

  const extractFocus =
    workflow === "extract"
      ? "\n## Remember focus\n" +
        "Input priority: (1) eventTranscript if present, (2) rawNotes as attention signal, (3) organizedNotes, " +
        "(4) eventPageContext for speakers/topics, (5) mediaCaptures captions + screenshotDescriptions. " +
        "Use the expertise profile to decide what THIS user might have missed — prioritize their learning goals and ongoing projects. " +
        "Prefer portable heuristics over recap. Reject speaker bios and slide-title claims.\n"
      : "";
  const draftFocus =
    workflow === "draft"
      ? "\n## Create focus\n" +
        "Write like a post the user would publish: belief-shift opener, one wedge, teachable structure, practical closer. " +
        "Never open with attending an event or listing panelists. " +
        "Use `matteredLine` as the primary wedge when present. " +
        "Match `pastPostExamples`, `voiceTraits`, and `avoidPatterns`. " +
        "If `selectedThemeIds` is set, only draft for those themes. " +
        "If exactly 1 theme is selected, return 2 distinct LinkedIn drafts (different hooks). " +
        "If 2+ themes are selected, return 1 draft per theme.\n"
      : "";
  const reviewFocus =
    workflow === "self-critique"
      ? "\n## Review focus\nReturn `evalScores` with an integer **1–5 score** and a one-sentence justification per dimension. Use the full scale — reserve 5 for excellent drafts and 1–2 for serious issues. Heavily penalize event-recap openers and missing wedge.\n"
      : "";
  const learningsBlock =
    profile &&
    (workflow === "extract" ||
      workflow === "synthesize" ||
      workflow === "draft" ||
      workflow === "self-critique")
      ? formatLearningsForPrompt(profile)
      : "";

  // For extract, pass a lean lens (not full resume) so takeaways are user-important.
  const profileForPrompt =
    profile && workflow === "extract"
      ? {
          name: profile.name,
          tagline: profile.tagline,
          currentRole: profile.currentRole,
          expertiseAreas: profile.expertiseAreas,
          contentPriorities: profile.contentPriorities,
          assumptionPatterns: profile.assumptionPatterns,
          industries: profile.industries,
        }
      : profile;

  const userContext = [
    "## Event session",
    formatSessionContext(session, workflow),
    extractFocus,
    draftFocus,
    reviewFocus,
    profileForPrompt
      ? "\n## Expertise profile\n" + formatProfile(profileForPrompt as ExpertiseProfile)
      : "",
    learningsBlock ? "\n" + learningsBlock : "",
    resume && workflow !== "draft" ? "\n## Resume (professional context)\n" + resume : "",
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
