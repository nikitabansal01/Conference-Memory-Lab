import type {
  EventEnrichment,
  EventEnrichmentSpeaker,
  EventSession,
  ExpertiseProfile,
  FollowUpDraft,
  Person,
} from "../models/types.js";
import { resolveSessionTitle } from "./session.js";

export interface ConnectionDraft {
  id: string;
  name: string;
  title?: string;
  company?: string;
  deliveryTopic: string;
  lensAngle: string;
  linkedInUrl?: string;
  role?: string;
  message: string;
  source: "pipeline" | "event_page" | "notes";
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

function matchesToken(haystack: string[], part: string): boolean {
  if (part.length < 4) return haystack.includes(part);
  const stem = part.slice(0, 4);
  return haystack.some((token) => {
    if (token.includes(part) || part.includes(token)) return true;
    return token.startsWith(stem) || part.startsWith(token.slice(0, 4));
  });
}

function overlap(haystack: string[], needles: string[]): string[] {
  const hits: string[] = [];
  for (const needle of needles) {
    const parts = tokens(needle);
    if (parts.some((part) => matchesToken(haystack, part))) {
      hits.push(needle);
    }
  }
  return hits.sort((a, b) => b.length - a.length);
}

function isGenericTopic(topic: string): boolean {
  return /^(ai|tech|sf|nyc|meetup|networking)$/i.test(topic.trim());
}

function isPersonName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.split(/\s+/).length < 2) return false;
  if (/^(braintrust|composio|replit|fireworks ai)$/i.test(trimmed)) return false;
  return true;
}

function isConnectableSpeaker(speaker: EventEnrichmentSpeaker): boolean {
  if (!isPersonName(speaker.name)) return false;
  if (speaker.linkedInUrl && /linkedin\.com\/company\//i.test(speaker.linkedInUrl)) return false;
  return true;
}

function inferEventTheme(enrichment?: EventEnrichment): string | undefined {
  if (!enrichment) return undefined;

  const title = enrichment.title.toLowerCase();
  if (/eval|evaluation/.test(title)) return "agent evaluation and production reliability";
  if (/agent/.test(title)) return "agentic AI in production";
  if (/health|clinical|care/.test(title)) return "health AI product design";

  const usefulTopic = enrichment.topics.find((topic) => topic.trim() && !isGenericTopic(topic));
  if (usefulTopic) return usefulTopic;

  const lead = enrichment.description
    .split(/\n\n+/)
    .map((block) => block.trim())
    .find((block) => block.length > 20 && !/^cohosts$/i.test(block));

  if (lead && lead.length <= 140) return lead.replace(/\.$/, "");
  return undefined;
}

function speakerDeliveryTopic(speaker: EventEnrichmentSpeaker, session: EventSession): string {
  const enrichment = session.eventEnrichment;
  const eventTheme = inferEventTheme(enrichment);
  const eventTitle = resolveSessionTitle(session);

  if (speaker.role === "host") {
    if (speaker.title || speaker.company) {
      const org = [speaker.title, speaker.company].filter(Boolean).join(" at ");
      return `hosting ${eventTitle}${org ? ` (${org})` : ""}`;
    }
    return `hosting ${eventTitle}`;
  }

  if (speaker.title && speaker.company) {
    const role = `${speaker.title} at ${speaker.company}`;
    return eventTheme ? `${role} — speaking on ${eventTheme}` : role;
  }

  if (speaker.topic && !speaker.topic.startsWith("http")) {
    return eventTheme ? `${speaker.topic} — ${eventTheme}` : speaker.topic;
  }

  return eventTheme ?? `the ${eventTitle} program`;
}

function lensMatch(
  profile: ExpertiseProfile,
  speaker: EventEnrichmentSpeaker,
  session: EventSession
): { area?: string; priority?: string } {
  const enrichment = session.eventEnrichment;
  const combined = tokens(
    [
      speaker.name,
      speaker.title,
      speaker.company,
      speaker.topic,
      enrichment?.title,
      enrichment?.description,
      inferEventTheme(enrichment),
    ]
      .filter(Boolean)
      .join(" ")
  );

  return {
    area: overlap(combined, profile.expertiseAreas ?? [])[0],
    priority: overlap(combined, profile.contentPriorities ?? [])[0],
  };
}

function lensAngleForSpeaker(
  profile: ExpertiseProfile,
  speaker: EventEnrichmentSpeaker,
  session: EventSession
): string {
  const { area, priority } = lensMatch(profile, speaker, session);

  if (area && priority) {
    return `Your lens on ${shortenLabel(area)} maps to their talk — especially ${shortenLabel(priority).toLowerCase()}.`;
  }

  if (area) {
    return `Your expertise in ${area} overlaps with what they're covering.`;
  }

  if (priority) {
    return `Their topic connects to your focus on ${priority.toLowerCase()}.`;
  }

  if (profile.currentRole) {
    return `Relevant to your work as ${profile.currentRole.split(",")[0].trim()}.`;
  }

  if (profile.tagline) {
    return profile.tagline;
  }

  return "Complete Your Unique Lens for sharper connection notes.";
}

function shortenLabel(text: string, maxLength = 72): string {
  const primary = text.split(" — ")[0].split(" - ")[0].trim();
  if (primary.length <= maxLength) return primary;
  return `${primary.slice(0, maxLength - 1).trim()}…`;
}

function lensHookForMessage(
  profile: ExpertiseProfile,
  speaker: EventEnrichmentSpeaker,
  session: EventSession
): string {
  const { area, priority } = lensMatch(profile, speaker, session);

  if (area && priority) {
    return `I'm focused on ${shortenLabel(area).toLowerCase()} — especially ${shortenLabel(priority).toLowerCase()}.`;
  }

  if (area) {
    return `I'm focused on ${shortenLabel(area).toLowerCase()}.`;
  }

  if (profile.currentRole) {
    return `I'm working on ${shortenLabel(profile.currentRole).toLowerCase()}.`;
  }

  return "This session looks aligned with what I'm building.";
}

function messageDeliveryTopic(deliveryTopic: string): string {
  const parts = deliveryTopic.split(" — ");
  const focus = parts.length > 1 ? parts[parts.length - 1] : deliveryTopic;
  return focus.replace(/^speaking on /i, "").toLowerCase();
}

function trimLinkedInNote(message: string, maxLength = 300): string {
  if (message.length <= maxLength) return message;
  const shortened = message.slice(0, maxLength - 1).trimEnd();
  const lastSpace = shortened.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.65) {
    return `${shortened.slice(0, lastSpace).replace(/[.,;:\-–—\s]+$/, "")}…`;
  }
  return `${shortened.replace(/[.,;:\-–—\s]+$/, "")}…`;
}

function buildSpeakerInvitation(
  speaker: EventEnrichmentSpeaker,
  session: EventSession,
  profile: ExpertiseProfile
): string {
  const name = firstName(speaker.name);
  const eventTitle = resolveSessionTitle(session);
  const delivery = speakerDeliveryTopic(speaker, session);
  const lens = lensHookForMessage(profile, speaker, session);
  const focus = messageDeliveryTopic(delivery);

  const message =
    speaker.role === "host"
      ? `${name} — I'm attending "${eventTitle}" and interested in ${delivery.toLowerCase()}. ${lens} Would love to connect ahead of the event.`
      : `${name} — I'm attending "${eventTitle}" for ${focus}. ${lens} Would love to connect before the session.`;

  return trimLinkedInNote(message);
}

function buildNotesMessage(
  person: Person,
  session: EventSession,
  profile: ExpertiseProfile
): { message: string; deliveryTopic: string; lensAngle: string } {
  const name = firstName(person.name);
  const eventTitle = resolveSessionTitle(session);
  const detail =
    person.conversationNotes?.trim() ||
    (person.metInPerson ? "our conversation at the event" : "what you shared at the event");
  const deliveryTopic = person.title
    ? `${person.title}${person.company ? ` at ${person.company}` : ""}`
    : detail;
  const lensAngle = lensAngleForSpeaker(
    profile,
    {
      name: person.name,
      title: person.title,
      company: person.company,
      topic: person.conversationNotes,
    },
    session
  );

  return {
    deliveryTopic,
    lensAngle,
    message: trimLinkedInNote(
      `${name} — ${detail} at "${eventTitle}" stuck with me. ${lensAngle} Would love to stay in touch.`
    ),
  };
}

function speakerKey(speaker: Pick<EventEnrichmentSpeaker, "name" | "linkedInUrl">): string {
  if (speaker.linkedInUrl) return speaker.linkedInUrl.toLowerCase();
  return speaker.name.trim().toLowerCase();
}

function enrichmentSpeakers(session: EventSession): EventEnrichmentSpeaker[] {
  return (session.eventEnrichment?.speakers ?? []).filter(isConnectableSpeaker);
}

function peopleFromNotes(session: EventSession): Person[] {
  return (session.people ?? []).filter((person) => person.metInPerson || person.conversationNotes?.trim());
}

function draftSortRank(draft: ConnectionDraft): number {
  if (draft.source === "pipeline") return 0;
  if (draft.role === "speaker") return 1;
  if (draft.role === "host") return 2;
  return 3;
}

export function buildConnectionDrafts(
  session: EventSession,
  profile: ExpertiseProfile
): ConnectionDraft[] {
  if (session.followUpDrafts?.length) {
    const people = Object.fromEntries((session.people ?? []).map((person) => [person.id, person]));
    return session.followUpDrafts
      .map((draft: FollowUpDraft) => {
        const person = people[draft.personId];
        const notes = person
          ? buildNotesMessage(person, session, profile)
          : {
              deliveryTopic: "Follow-up from your notes",
              lensAngle: lensAngleForSpeaker(profile, { name: "Contact" }, session),
            };
        return {
          id: draft.id,
          name: person?.name ?? "Contact",
          title: person?.title,
          company: person?.company,
          deliveryTopic: notes.deliveryTopic,
          lensAngle: notes.lensAngle,
          linkedInUrl: person?.linkedInUrl,
          message: draft.message,
          source: "pipeline" as const,
        };
      })
      .sort((a, b) => draftSortRank(a) - draftSortRank(b));
  }

  const drafts: ConnectionDraft[] = [];
  const seen = new Set<string>();

  for (const speaker of enrichmentSpeakers(session)) {
    const key = speakerKey(speaker);
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push({
      id: `connect-${key.replace(/[^a-z0-9]+/g, "-")}`,
      name: speaker.name,
      title: speaker.title,
      company: speaker.company,
      deliveryTopic: speakerDeliveryTopic(speaker, session),
      lensAngle: lensAngleForSpeaker(profile, speaker, session),
      linkedInUrl: speaker.linkedInUrl,
      role: speaker.role,
      message: buildSpeakerInvitation(speaker, session, profile),
      source: "event_page",
    });
  }

  for (const person of peopleFromNotes(session)) {
    const key = person.linkedInUrl?.toLowerCase() ?? person.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const notes = buildNotesMessage(person, session, profile);
    drafts.push({
      id: `connect-${person.id}`,
      name: person.name,
      title: person.title,
      company: person.company,
      deliveryTopic: notes.deliveryTopic,
      lensAngle: notes.lensAngle,
      linkedInUrl: person.linkedInUrl,
      message: notes.message,
      source: "notes",
    });
  }

  return drafts.sort((a, b) => draftSortRank(a) - draftSortRank(b));
}
