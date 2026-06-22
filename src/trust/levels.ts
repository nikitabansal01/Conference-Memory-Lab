import type { TrustLevel } from "../models/types.js";

export interface LevelDefinition {
  level: TrustLevel;
  name: string;
  tagline: string;
  xpRequired: number;
  permittedActions: string[];
  blockedActions: string[];
}

export const TRUST_LEVELS: LevelDefinition[] = [
  {
    level: 0,
    name: "Observer",
    tagline: "Capture without giving anything away",
    xpRequired: 0,
    permittedActions: [
      "create_session",
      "import_notes",
      "import_screenshots",
      "run_extract",
      "view_claims",
      "view_people",
    ],
    blockedActions: ["load_profile", "generate_drafts", "publish", "linkedin_oauth"],
  },
  {
    level: 1,
    name: "Synthesizer",
    tagline: "Connect learnings to who you are",
    xpRequired: 100,
    permittedActions: [
      "load_profile",
      "run_synthesize",
      "view_themes",
      "view_assumption_challenges",
      "compare_to_profile",
    ],
    blockedActions: ["generate_content_drafts", "generate_followup_drafts", "publish"],
  },
  {
    level: 2,
    name: "Drafter",
    tagline: "Thought partner for non-obvious insights",
    xpRequired: 250,
    permittedActions: [
      "generate_content_angles",
      "generate_followup_drafts",
      "generate_content_drafts",
      "view_eval_scores",
      "self_critique",
    ],
    blockedActions: ["export_clipboard", "publish", "linkedin_oauth"],
  },
  {
    level: 3,
    name: "Editor",
    tagline: "Multi-format, human-approved output",
    xpRequired: 500,
    permittedActions: [
      "export_clipboard",
      "export_markdown",
      "multi_platform_format",
      "eval_dashboard",
      "approve_draft",
    ],
    blockedActions: ["publish", "linkedin_oauth", "auto_send_connection"],
  },
  {
    level: 4,
    name: "Publisher",
    tagline: "One platform, review queue first",
    xpRequired: 1000,
    permittedActions: ["linkedin_oauth", "schedule_publish", "review_queue"],
    blockedActions: ["auto_send_connection", "multi_platform_auto_publish"],
  },
  {
    level: 5,
    name: "Networker",
    tagline: "Context-rich connection drafts",
    xpRequired: 2000,
    permittedActions: [
      "parse_luma_url",
      "speaker_graph",
      "connection_message_drafts",
      "batch_followup_drafts",
    ],
    blockedActions: ["auto_send_connection"],
  },
  {
    level: 6,
    name: "Autopilot",
    tagline: "Full pipeline with audit and rollback",
    xpRequired: 4000,
    permittedActions: [
      "multi_platform_auto_publish",
      "auto_send_connection",
      "audit_log",
      "rollback",
    ],
    blockedActions: [],
  },
];

export function levelFromXp(xp: number): TrustLevel {
  let current: TrustLevel = 0;
  for (const def of TRUST_LEVELS) {
    if (xp >= def.xpRequired) current = def.level;
  }
  return current;
}

export function getLevelDefinition(level: TrustLevel): LevelDefinition {
  return TRUST_LEVELS.find((l) => l.level === level) ?? TRUST_LEVELS[0];
}

export function getCumulativeActions(level: TrustLevel): string[] {
  const actions = new Set<string>();
  for (const def of TRUST_LEVELS) {
    if (def.level <= level) {
      for (const action of def.permittedActions) actions.add(action);
    }
  }
  return [...actions];
}

export function canPerformAction(
  userLevel: TrustLevel,
  action: string
): { allowed: boolean; requiredLevel?: TrustLevel } {
  const cumulative = getCumulativeActions(userLevel);
  if (cumulative.includes(action)) {
    return { allowed: true };
  }

  for (const levelDef of TRUST_LEVELS) {
    if (levelDef.permittedActions.includes(action)) {
      return { allowed: false, requiredLevel: levelDef.level };
    }
  }

  return { allowed: false };
}

export function xpToNextLevel(currentXp: number): {
  current: TrustLevel;
  next: TrustLevel | null;
  xpNeeded: number;
  progressPct: number;
} {
  const current = levelFromXp(currentXp);
  const nextDef = TRUST_LEVELS.find((l) => l.level === current + 1);

  if (!nextDef) {
    return { current, next: null, xpNeeded: 0, progressPct: 100 };
  }

  const currentDef = getLevelDefinition(current);
  const range = nextDef.xpRequired - currentDef.xpRequired;
  const progress = currentXp - currentDef.xpRequired;
  const progressPct = Math.min(100, Math.round((progress / range) * 100));

  return {
    current,
    next: nextDef.level,
    xpNeeded: nextDef.xpRequired - currentXp,
    progressPct,
  };
}
