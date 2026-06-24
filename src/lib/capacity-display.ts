import type { TrustLevel } from "../models/types.js";
import { getLevelDefinition, xpToNextLevel } from "../trust/levels.js";

/** User-facing capacity names (L1–L6), aligned with product mockups. */
export const CAPACITY_LEVELS: {
  trustLevel: TrustLevel;
  label: string;
  name: string;
  tagline: string;
}[] = [
  { trustLevel: 0, label: "L1", name: "Observer", tagline: "Capture & summarize events" },
  { trustLevel: 1, label: "L2", name: "Thinking Partner", tagline: "Compare ideas & challenge assumptions" },
  { trustLevel: 2, label: "L3", name: "Content Collaborator", tagline: "Create content & share insights" },
  { trustLevel: 3, label: "L4", name: "Networking Assistant", tagline: "Personalized outreach & follow-ups" },
  { trustLevel: 4, label: "L5", name: "Workflow Assistant", tagline: "Automate tasks & save you time" },
  { trustLevel: 5, label: "L6", name: "Trusted Delegate", tagline: "You focus, I handle the rest" },
];

const MAX_CAPACITY_INDEX = CAPACITY_LEVELS.length - 1;

export function capacityDisplayName(trustLevel: TrustLevel): string {
  const capped = Math.min(trustLevel, MAX_CAPACITY_INDEX) as TrustLevel;
  return CAPACITY_LEVELS.find((l) => l.trustLevel === capped)?.name ?? getLevelDefinition(trustLevel).name;
}

export function capacityDisplayLevel(trustLevel: TrustLevel): number {
  return Math.min(trustLevel + 1, CAPACITY_LEVELS.length);
}

export function computeOverallCapacityPct(trustLevel: TrustLevel, progressToNextPct: number): number {
  if (trustLevel >= CAPACITY_LEVELS.length) return 100;
  const clampedLevel = Math.min(trustLevel, MAX_CAPACITY_INDEX);
  const progress = progressToNextPct / 100;
  return Math.min(100, Math.round(((clampedLevel + progress) / CAPACITY_LEVELS.length) * 100));
}

export function capacityScaleDotPct(trustLevel: TrustLevel): number {
  const index = Math.min(Math.max(trustLevel, 0), MAX_CAPACITY_INDEX);
  if (MAX_CAPACITY_INDEX === 0) return 0;
  return (index / MAX_CAPACITY_INDEX) * 100;
}

export interface CapacitySidebarModel {
  displayLevel: number;
  displayName: string;
  overallPct: number;
  scaleDotPct: number;
  ticks: { label: string; unlocked: boolean; current: boolean }[];
  nextName: string | null;
  unlockPct: number | null;
}

export function buildCapacitySidebarModel(
  trustLevel: TrustLevel,
  totalXp: number
): CapacitySidebarModel {
  const xpProgress = xpToNextLevel(totalXp);
  const progressPct = xpProgress.progressPct;
  const displayLevel = capacityDisplayLevel(trustLevel);
  const displayName = capacityDisplayName(trustLevel);
  const overallPct = computeOverallCapacityPct(trustLevel, progressPct);
  const scaleDotPct = capacityScaleDotPct(trustLevel);

  const nextTrust = xpProgress.next;
  const nextName = nextTrust !== null ? capacityDisplayName(nextTrust as TrustLevel) : null;
  const unlockPct = nextTrust !== null ? progressPct : null;

  const ticks = CAPACITY_LEVELS.map((entry) => ({
    label: entry.label,
    unlocked: trustLevel >= entry.trustLevel,
    current: trustLevel === entry.trustLevel,
  }));

  return {
    displayLevel,
    displayName,
    overallPct,
    scaleDotPct,
    ticks,
    nextName,
    unlockPct,
  };
}
