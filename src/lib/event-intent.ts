import type { EventEnrichment, ExpertiseProfile } from "../models/types.js";

export interface EventIntentSuggestion {
  id: string;
  text: string;
  rationale: string;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

function overlap(haystack: string[], needles: string[]): string[] {
  const hits: string[] = [];
  for (const needle of needles) {
    const parts = tokens(needle);
    if (parts.some((part) => haystack.some((h) => h.includes(part) || part.includes(h)))) {
      hits.push(needle);
    }
  }
  return hits;
}

export function buildEventIntentSuggestions(
  enrichment: Pick<EventEnrichment, "title" | "description" | "topics">,
  profile: Pick<ExpertiseProfile, "expertiseAreas" | "contentPriorities" | "currentRole">
): EventIntentSuggestion[] {
  const eventText = tokens([enrichment.title, enrichment.description, ...(enrichment.topics ?? [])].join(" "));
  const matchedAreas = overlap(eventText, profile.expertiseAreas ?? []).slice(0, 2);
  const matchedProjects = overlap(eventText, profile.contentPriorities ?? []).slice(0, 1);
  const suggestions: EventIntentSuggestion[] = [];

  if (matchedAreas.length && matchedProjects.length) {
    suggestions.push({
      id: "apply",
      text: `Apply ${matchedAreas[0]} insights from this event to ${matchedProjects[0]}.`,
      rationale: `The event touches ${matchedAreas.join(" and ")}, which maps to your active project focus.`,
    });
  }

  if (matchedAreas.length) {
    suggestions.push({
      id: "learn",
      text: `Go deep on ${matchedAreas.join(" and ")} — compare what you hear to your current thinking.`,
      rationale: "This event overlaps your learning goals in Unique Lens.",
    });
  }

  if (profile.currentRole) {
    suggestions.push({
      id: "network",
      text: `Meet 2–3 people whose work connects to ${profile.currentRole} — quality over quantity.`,
      rationale: "Keeps the event high-impact: intentional connections, not volume.",
    });
  }

  if (matchedProjects.length && !suggestions.some((s) => s.id === "apply")) {
    suggestions.push({
      id: "project",
      text: `Listen for ideas I can apply to ${matchedProjects[0]}.`,
      rationale: "Anchors attendance to an ongoing project you care about.",
    });
  }

  suggestions.push({
    id: "filter",
    text: "Only stay if I leave with one non-obvious insight worth acting on this month.",
    rationale: "Helps you treat events as selective, not automatic.",
  });

  const seen = new Set<string>();
  return suggestions.filter((s) => {
    if (seen.has(s.text)) return false;
    seen.add(s.text);
    return true;
  }).slice(0, 3);
}
