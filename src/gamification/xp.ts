import type { SessionStage, TrustLevel } from "../models/types.js";
import { levelFromXp } from "../trust/levels.js";

export const XP_REWARDS: Record<string, number> = {
  create_session: 25,
  complete_extract: 50,
  complete_synthesize: 75,
  complete_draft: 100,
  approve_draft: 50,
  publish: 150,
};

export const STAGE_XP: Partial<Record<SessionStage, number>> = {
  extracted: XP_REWARDS.complete_extract,
  synthesized: XP_REWARDS.complete_synthesize,
  drafted: XP_REWARDS.complete_draft,
  published: XP_REWARDS.publish,
};

export const MILESTONES = [
  {
    id: "first_event",
    title: "First Capture",
    description: "Log your first networking event",
    xpReward: 25,
    trigger: "sessionsCompleted >= 1",
  },
  {
    id: "memory_keeper",
    title: "Memory Keeper",
    description: "Complete extract + synthesize on 3 events",
    xpReward: 100,
    trigger: "sessionsCompleted >= 3",
  },
  {
    id: "thought_partner",
    title: "Thought Partner",
    description: "Generate your first non-obvious content angle",
    xpReward: 75,
    trigger: "hasContentAngle",
  },
  {
    id: "connector",
    title: "Connector",
    description: "Draft 5 contextual follow-up messages",
    xpReward: 100,
    trigger: "followUpDrafts >= 5",
  },
  {
    id: "level_up_drafter",
    title: "Drafter Unlocked",
    description: "Reach Level 2 — thought partner mode",
    xpReward: 0,
    trigger: "level >= 2",
  },
] as const;

export function computeSessionXp(stage: SessionStage): number {
  return STAGE_XP[stage] ?? 0;
}

export function awardXp(currentXp: number, amount: number): {
  newXp: number;
  previousLevel: TrustLevel;
  newLevel: TrustLevel;
  leveledUp: boolean;
} {
  const previousLevel = levelFromXp(currentXp);
  const newXp = currentXp + amount;
  const newLevel = levelFromXp(newXp);

  return {
    newXp,
    previousLevel,
    newLevel,
    leveledUp: newLevel > previousLevel,
  };
}

export function formatLevelBadge(level: TrustLevel, name: string): string {
  const stars = "★".repeat(level) + "☆".repeat(6 - level);
  return `[L${level} ${name}] ${stars}`;
}
