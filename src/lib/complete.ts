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

export function mergeSessionUpdate(
  session: EventSession,
  update: Partial<EventSession>
): EventSession {
  return {
    ...session,
    ...update,
    updatedAt: new Date().toISOString(),
    people: update.people ?? session.people,
    interactions: update.interactions ?? session.interactions,
    claims: update.claims ?? session.claims,
    themes: update.themes ?? session.themes,
    assumptionChallenges: update.assumptionChallenges ?? session.assumptionChallenges,
    contentAngles: update.contentAngles ?? session.contentAngles,
    followUpDrafts: update.followUpDrafts ?? session.followUpDrafts,
    contentDrafts: update.contentDrafts ?? session.contentDrafts,
    evalScores: update.evalScores ?? session.evalScores,
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
