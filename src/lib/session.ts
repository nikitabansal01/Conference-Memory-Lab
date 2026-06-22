import { randomUUID } from "node:crypto";
import type {
  EventSession,
  EventType,
  ExpertiseProfile,
  UserProgress,
} from "../models/types.js";
import { XP_REWARDS, awardXp } from "../gamification/xp.js";
import { getLevelDefinition, levelFromXp, getCumulativeActions } from "../trust/levels.js";

const DEFAULT_PROGRESS: UserProgress = {
  totalXp: 0,
  level: 0,
  sessionsCompleted: 0,
  draftsApproved: 0,
  eventsAttended: 0,
  unlockedActions: [],
  milestones: [],
};

export function createSession(input: {
  title: string;
  eventType: EventType;
  rawNotes: string;
  eventUrl?: string;
  location?: string;
  screenshotDescriptions?: string[];
  userProgress: UserProgress;
}): { session: EventSession; progress: UserProgress } {
  const now = new Date().toISOString();
  const level = levelFromXp(input.userProgress.totalXp);

  const session: EventSession = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    title: input.title,
    eventType: input.eventType,
    eventUrl: input.eventUrl,
    location: input.location,
    rawNotes: input.rawNotes,
    screenshotDescriptions: input.screenshotDescriptions ?? [],
    stage: "ingested",
    trustLevelAtCreation: level,
    people: [],
    interactions: [],
    claims: [],
    themes: [],
    assumptionChallenges: [],
    contentAngles: [],
    followUpDrafts: [],
    contentDrafts: [],
    xpEarned: 0,
  };

  const xpResult = awardXp(input.userProgress.totalXp, XP_REWARDS.create_session);
  const progress: UserProgress = {
    ...input.userProgress,
    totalXp: xpResult.newXp,
    level: xpResult.newLevel,
    eventsAttended: input.userProgress.eventsAttended + 1,
    unlockedActions: getCumulativeActions(xpResult.newLevel),
  };

  return { session, progress };
}

export function emptyProgress(): UserProgress {
  return { ...DEFAULT_PROGRESS };
}

export function loadProfileTemplate(): ExpertiseProfile {
  return {
    name: "Your Name",
    tagline: "Product leader at the intersection of healthcare, HCD, and LLM evaluation",
    expertiseAreas: [
      "product management",
      "human-centered design",
      "healthcare regulated workflows",
      "LLM evaluation frameworks",
      "agentic AI workflow design",
    ],
    industries: ["healthcare", "health tech", "AI/ML"],
    voiceTraits: [
      "curious but grounded",
      "connects tactical learnings to strategic implications",
      "avoids hype; names tradeoffs explicitly",
      "uses concrete examples from regulated environments",
    ],
    avoidPatterns: [
      "generic AI enthusiasm without nuance",
      "restating speaker slides without adding perspective",
      "jargon without explanation",
      "claims not supported by what was actually said at the event",
    ],
    pastPostExamples: [
      "Paste 2-3 of your best LinkedIn posts here so the agent learns your voice.",
    ],
    contentPriorities: [
      "Less obvious insights others at the event might miss",
      "Implications for PMs building in regulated industries",
      "Evaluation and trust design angles on frontier AI talks",
    ],
    assumptionPatterns: [
      "What would break this assumption in a hospital workflow?",
      "Who is this optimized for — builders, buyers, or patients?",
      "What would an evaluator ask that the panel didn't address?",
    ],
  };
}
