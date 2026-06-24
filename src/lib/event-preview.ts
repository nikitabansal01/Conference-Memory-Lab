import type { EventEnrichment, EventSession, Person } from "../models/types.js";
import { parseEventUrl } from "./event-url.js";

export interface EventSpeakerPreview {
  id: string;
  name: string;
  title?: string;
  company?: string;
  topic?: string;
  linkedInUrl?: string;
  role?: string;
}

export interface EventPreview {
  title: string;
  sourceLabel: string;
  eventUrl: string;
  summary: string;
  about?: string;
  location?: string;
  attendeeCount?: number;
  speakers: EventSpeakerPreview[];
  topics: string[];
  enrichmentStatus: "extracted" | "from_page" | "from_notes" | "pending";
  enrichmentHint?: string;
}

function speakerFromPerson(person: Person, topic?: string): EventSpeakerPreview {
  return {
    id: person.id,
    name: person.name,
    title: person.title,
    company: person.company,
    topic,
    linkedInUrl: person.linkedInUrl,
    role: person.role,
  };
}

function speakersFromEnrichment(enrichment: EventEnrichment): EventSpeakerPreview[] {
  return enrichment.speakers.map((speaker, index) => ({
    id: `enrichment-${index}`,
    name: speaker.name,
    title: speaker.title,
    company: speaker.company,
    topic: speaker.topic,
    linkedInUrl: speaker.linkedInUrl,
    role: speaker.role,
  }));
}

function topicsFromSession(session: EventSession): string[] {
  const fromThemes = session.themes.map((t) => t.label).slice(0, 4);
  if (fromThemes.length) return fromThemes;

  return session.claims
    .map((c) => c.text.replace(/\[non-obvious\]\s*/i, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function speakersFromSession(session: EventSession): EventSpeakerPreview[] {
  if (!session.people.length) return [];

  const speakers = session.people.filter((p) => p.role === "speaker" || p.role === "organizer");
  const list = speakers.length ? speakers : session.people.slice(0, 8);

  return list.map((person) => {
    const relatedClaim = session.claims.find((c) =>
      c.text.toLowerCase().includes(person.name.toLowerCase())
    );
    return speakerFromPerson(person, relatedClaim?.text.slice(0, 160));
  });
}

function mergeSpeakers(
  fromPage: EventSpeakerPreview[],
  fromSession: EventSpeakerPreview[]
): EventSpeakerPreview[] {
  if (!fromSession.length) return fromPage;
  if (!fromPage.length) return fromSession;

  const merged = [...fromPage];
  const seen = new Set(fromPage.map((s) => s.name.toLowerCase()));

  for (const speaker of fromSession) {
    const key = speaker.name.toLowerCase();
    if (seen.has(key)) {
      const existing = merged.find((s) => s.name.toLowerCase() === key);
      if (existing) {
        existing.topic = existing.topic ?? speaker.topic;
        existing.linkedInUrl = existing.linkedInUrl ?? speaker.linkedInUrl;
        existing.title = existing.title ?? speaker.title;
        existing.company = existing.company ?? speaker.company;
      }
      continue;
    }
    seen.add(key);
    merged.push(speaker);
  }

  return merged;
}

function summaryFromEnrichment(enrichment: EventEnrichment, sourceLabel: string): string {
  if (enrichment.description) {
    return enrichment.description.length > 320
      ? `${enrichment.description.slice(0, 317)}…`
      : enrichment.description;
  }

  const bits = [`Linked via ${sourceLabel}.`];
  if (enrichment.location) bits.push(`Location: ${enrichment.location}.`);
  if (enrichment.speakers.length) {
    const hosts = enrichment.speakers.filter((s) => s.role === "host");
    if (hosts.length) bits.push(`Host: ${hosts.map((h) => h.name).join(", ")}.`);
  }
  if (enrichment.attendeeCount) {
    bits.push(`${enrichment.attendeeCount} people registered on the event page.`);
  }
  return bits.join(" ");
}

function summaryFromSession(session: EventSession, sourceLabel: string): string {
  if (session.themes[0]?.label) {
    return `Linked via ${sourceLabel}. Core theme so far: ${session.themes[0].label}.`;
  }

  const notesLead = session.rawNotes
    .split(/\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 24 && !line.startsWith("#"));

  if (notesLead) {
    return `Linked via ${sourceLabel}. From your notes: ${notesLead.slice(0, 160)}${notesLead.length > 160 ? "…" : ""}`;
  }

  return `Linked via ${sourceLabel}. Capture what stood out — Remember will pull speakers and topics from your notes and the event page.`;
}

export function buildEventPreview(session: EventSession): EventPreview | null {
  if (!session.eventUrl) return null;

  const linkInfo = parseEventUrl(session.eventUrl);
  const sourceLabel = linkInfo?.label ?? "Event page";
  const enrichment = session.eventEnrichment;
  const pageSpeakers = enrichment ? speakersFromEnrichment(enrichment) : [];
  const sessionSpeakers = speakersFromSession(session);
  const speakers = mergeSpeakers(pageSpeakers, sessionSpeakers);
  const topics = [
    ...(enrichment?.topics ?? []),
    ...topicsFromSession(session),
  ].filter((topic, index, all) => all.indexOf(topic) === index).slice(0, 6);

  const hasPageData = Boolean(
    enrichment &&
      (enrichment.description || enrichment.speakers.length || enrichment.topics.length || enrichment.attendeeCount)
  );
  const hasSessionExtraction =
    sessionSpeakers.length > 0 || topicsFromSession(session).length > 0 || session.stage !== "ingested";

  let enrichmentStatus: EventPreview["enrichmentStatus"] = "pending";
  if (hasSessionExtraction && session.people.length) enrichmentStatus = "extracted";
  else if (hasSessionExtraction) enrichmentStatus = "from_notes";
  else if (hasPageData) enrichmentStatus = "from_page";

  const summary = hasPageData
    ? summaryFromEnrichment(enrichment!, sourceLabel)
    : summaryFromSession(session, sourceLabel);

  return {
    title: enrichment?.title || session.title,
    sourceLabel,
    eventUrl: session.eventUrl,
    summary,
    about: enrichment?.description || undefined,
    location: enrichment?.location || session.location,
    attendeeCount: enrichment?.attendeeCount,
    speakers,
    topics,
    enrichmentStatus,
    enrichmentHint:
      hasPageData || hasSessionExtraction
        ? undefined
        : "We saved the link but could not read this page yet. Add notes and run Remember, or try again later.",
  };
}
