import type { EventSession, TrustLevel } from "../../models/types.js";
import type { RunnableWorkflow } from "../run-workflow.js";
import { canPerformAction } from "../../trust/levels.js";
import { notesChangedSinceExtract } from "../notes-fingerprint.js";

export interface AgentStepPlan {
  workflow: RunnableWorkflow | null;
  reason: string;
  requiresApproval: boolean;
  suggestedWorkflow?: RunnableWorkflow;
  notesStale?: boolean;
}

const NEXT_WORKFLOW: Partial<Record<EventSession["stage"], RunnableWorkflow>> = {
  ingested: "extract",
  extracted: "synthesize",
  synthesized: "draft",
  drafted: "self-critique",
};

const WORKFLOW_ACTION: Record<RunnableWorkflow, string> = {
  "organize-transcript": "run_extract",
  extract: "run_extract",
  synthesize: "run_synthesize",
  draft: "generate_content_drafts",
  "self-critique": "self_critique",
};

const REASON: Record<RunnableWorkflow, string> = {
  "organize-transcript": "Transcript ready to organize into structured notes",
  extract: "Notes need extracting into key takeaways",
  synthesize: "Takeaways ready — connecting to your lens",
  draft: "Generating drafts from your themes",
  "self-critique": "Scoring drafts against your rubric",
};

/** Create and Review can change shareable output — require explicit approval in P0. */
const APPROVAL_REQUIRED = new Set<RunnableWorkflow>(["draft", "self-critique"]);

const LATE_STAGES = new Set<EventSession["stage"]>(["synthesized", "drafted", "reviewed"]);

export function planNextAgentStep(
  session: EventSession,
  userLevel: TrustLevel,
  opts?: { approve?: RunnableWorkflow }
): AgentStepPlan {
  const notesStale = notesChangedSinceExtract(session);

  if (notesStale && LATE_STAGES.has(session.stage)) {
    if (opts?.approve !== "extract") {
      return {
        workflow: null,
        reason:
          "Notes changed after Remember. Re-extracting may replace Think and Create output — approve to re-run Remember.",
        requiresApproval: true,
        suggestedWorkflow: "extract",
        notesStale: true,
      };
    }
  }

  let next: RunnableWorkflow | undefined;

  if (notesStale && session.stage === "extracted") {
    next = "extract";
  } else {
    next = NEXT_WORKFLOW[session.stage];
  }

  if (!next) {
    if (session.stage === "reviewed") {
      return {
        workflow: null,
        reason: "Event loop complete. Review scores or export when ready.",
        requiresApproval: false,
      };
    }
    return { workflow: null, reason: "Nothing to run for this stage.", requiresApproval: false };
  }

  if (
    next === "extract" &&
    !session.rawNotes?.trim() &&
    !session.eventTranscript?.trim() &&
    !session.organizedNotes?.trim()
  ) {
    return { workflow: null, reason: "Add notes or a transcript before Remember can run.", requiresApproval: false };
  }

  const gate = canPerformAction(userLevel, WORKFLOW_ACTION[next]);
  if (!gate.allowed) {
    return {
      workflow: null,
      reason: `Locked at your trust level — unlock Level ${gate.requiredLevel} first.`,
      requiresApproval: false,
      suggestedWorkflow: next,
    };
  }

  if (APPROVAL_REQUIRED.has(next) && opts?.approve !== next) {
    const reason =
      next === "draft"
        ? "Think is done. Approve to generate drafts."
        : "Drafts exist. Approve to run Review.";
    return { workflow: null, reason, requiresApproval: true, suggestedWorkflow: next };
  }

  const reason =
    notesStale && next === "extract"
      ? "Notes changed since Remember — re-extracting takeaways"
      : REASON[next];

  return {
    workflow: next,
    reason,
    requiresApproval: false,
    notesStale: notesStale && next === "extract",
  };
}

/** Safe to chain in one Continue click without user approval. */
export function isSafeAutoChainWorkflow(workflow: RunnableWorkflow): boolean {
  return workflow === "extract" || workflow === "synthesize";
}
