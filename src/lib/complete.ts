import type { EventSession, SessionStage } from "../models/types.js";
import { computeSessionXp, awardXp } from "../gamification/xp.js";
import type { UserProgress } from "../models/types.js";
import { getCumulativeActions } from "../trust/levels.js";

const STAGE_ORDER: SessionStage[] = [
  "ingested",
  "extracted",
  "synthesized",
  "drafted",
  "reviewed",
  "published",
];

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export function mergeSessionUpdate(
  session: EventSession,
  update: Partial<EventSession>
): EventSession {
  return {
    ...session,
    ...update,
    updatedAt: new Date().toISOString(),
    people: update.people !== undefined ? asArray(update.people) : asArray(session.people),
    interactions:
      update.interactions !== undefined ? asArray(update.interactions) : asArray(session.interactions),
    claims: update.claims !== undefined ? asArray(update.claims) : asArray(session.claims),
    themes: update.themes !== undefined ? asArray(update.themes) : asArray(session.themes),
    assumptionChallenges:
      update.assumptionChallenges !== undefined
        ? asArray(update.assumptionChallenges)
        : asArray(session.assumptionChallenges),
    contentAngles:
      update.contentAngles !== undefined ? asArray(update.contentAngles) : asArray(session.contentAngles),
    followUpDrafts:
      update.followUpDrafts !== undefined ? asArray(update.followUpDrafts) : asArray(session.followUpDrafts),
    contentDrafts:
      update.contentDrafts !== undefined ? asArray(update.contentDrafts) : asArray(session.contentDrafts),
    evalScores: "evalScores" in update ? update.evalScores : session.evalScores,
  };
}

export function applyStageCompletion(
  session: EventSession,
  progress: UserProgress,
  newStage: SessionStage
): { session: EventSession; progress: UserProgress; xpAwarded: number; leveledUp: boolean } {
  const prevIdx = STAGE_ORDER.indexOf(session.stage);
  const newIdx = STAGE_ORDER.indexOf(newStage);

  if (newIdx <= prevIdx) {
    return { session, progress, xpAwarded: 0, leveledUp: false };
  }

  let xpAwarded = 0;
  for (let i = prevIdx + 1; i <= newIdx; i++) {
    xpAwarded += computeSessionXp(STAGE_ORDER[i]);
  }

  const xpResult = awardXp(progress.totalXp, xpAwarded);
  const updatedSession: EventSession = {
    ...session,
    stage: newStage,
    updatedAt: new Date().toISOString(),
    xpEarned: session.xpEarned + xpAwarded,
  };

  const updatedProgress: UserProgress = {
    ...progress,
    totalXp: xpResult.newXp,
    level: xpResult.newLevel,
    sessionsCompleted:
      newStage === "drafted" || newStage === "published"
        ? progress.sessionsCompleted + (session.stage === "ingested" ? 1 : 0)
        : progress.sessionsCompleted,
    unlockedActions: getCumulativeActions(xpResult.newLevel),
  };

  return {
    session: updatedSession,
    progress: updatedProgress,
    xpAwarded,
    leveledUp: xpResult.leveledUp,
  };
}
