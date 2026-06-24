import type { ExpertiseProfile } from "../models/types.js";

export interface ProfileStatus {
  complete: boolean;
  score: number;
  missing: string[];
  hasResume: boolean;
  hasRealPosts: boolean;
  lensSummary: string;
}

function hasRealPosts(profile: ExpertiseProfile): boolean {
  return profile.pastPostExamples.some(
    (p) =>
      p.length > 80 &&
      !p.toLowerCase().includes("paste your best") &&
      !p.toLowerCase().includes("example structure")
  );
}

export function getProfileStatus(
  profile: ExpertiseProfile,
  hasResume: boolean
): ProfileStatus {
  const missing: string[] = [];
  let score = 0;

  const hasBio =
    Boolean(profile.tagline) &&
    profile.tagline !== "Product leader at the intersection of healthcare, HCD, and LLM evaluation" &&
    profile.expertiseAreas.length >= 3;

  if (hasResume) {
    score += 40;
  } else if (hasBio && profile.currentRole) {
    score += 35;
  } else {
    missing.push("Upload resume or write your bio");
  }

  if (profile.expertiseAreas.length >= 3) score += 20;
  else missing.push("Add expertise areas");

  if (hasRealPosts(profile)) score += 25;
  else missing.push("Paste 2 LinkedIn posts for voice matching");

  if (profile.currentRole) score += 15;

  const lensSummary = hasResume
    ? `Reading you through your resume and ${profile.expertiseAreas.slice(0, 3).join(", ")} lens.`
    : profile.currentRole
      ? `Interpreting events through: ${profile.currentRole} · ${profile.expertiseAreas.slice(0, 2).join(", ")}`
      : "Complete your unique lens so insights connect to your work, not generic advice.";

  return {
    complete: score >= 70 && (hasResume || (hasBio && Boolean(profile.currentRole))),
    score: Math.min(100, score),
    missing,
    hasResume,
    hasRealPosts: hasRealPosts(profile),
    lensSummary,
  };
}
