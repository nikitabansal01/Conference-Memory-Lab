import type { EventEnrichment, EventEnrichmentSpeaker } from "../models/types.js";
import { parseEventUrl, type EventLinkSource } from "./event-url.js";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function linkedInUrl(handle?: string | null): string | undefined {
  if (!handle?.trim()) return undefined;
  const trimmed = handle.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `https://www.linkedin.com${path}`;
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(`property="${property}"[^>]*content="([^"]*)"`, "i"),
    new RegExp(`content="([^"]*)"[^>]*property="${property}"`, "i"),
    new RegExp(`name="${property}"[^>]*content="([^"]*)"`, "i"),
    new RegExp(`content="([^"]*)"[^>]*name="${property}"`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return stripHtml(match[1]);
  }
  return undefined;
}

function parseNextData(html: string): Record<string, unknown> | null {
  const match = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseJsonLd(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") blocks.push(item as Record<string, unknown>);
        }
      } else if (parsed && typeof parsed === "object") {
        blocks.push(parsed as Record<string, unknown>);
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return blocks;
}

function lumaSlugFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.replace(/^\/+/, "").split("/")[0];
    return slug || null;
  } catch {
    return null;
  }
}

function lumaFetchCandidates(url: string): string[] {
  const slug = lumaSlugFromUrl(url);
  const candidates = new Set<string>([url]);
  if (slug) {
    candidates.add(`https://lu.ma/${slug}`);
    candidates.add(`https://www.lu.ma/${slug}`);
    candidates.add(`https://luma.com/${slug}`);
  }
  return [...candidates];
}

async function fetchHtml(url: string, timeoutMs = 15000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface LumaPerson {
  name?: string;
  first_name?: string;
  last_name?: string;
  bio_short?: string | null;
  linkedin_handle?: string | null;
  title?: string;
  company?: string;
}

function lumaPersonName(person: LumaPerson): string {
  if (person.name?.trim()) return person.name.trim();
  return [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
}

function speakerFromLumaPerson(
  person: LumaPerson,
  role: EventEnrichmentSpeaker["role"],
  topic?: string
): EventEnrichmentSpeaker | null {
  const name = lumaPersonName(person);
  if (!name) return null;
  return {
    name,
    title: person.title,
    company: person.company,
    topic: topic ?? (person.bio_short?.trim() || undefined),
    linkedInUrl: linkedInUrl(person.linkedin_handle),
    role,
  };
}

function extractMirrorText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (!Array.isArray(n.content)) return "";

  const parts = n.content.map(extractMirrorText).filter(Boolean);
  if (n.type === "paragraph" || n.type === "heading") return parts.join("");
  return parts.join("\n");
}

function parseDescriptionMirror(mirror: unknown): string {
  if (typeof mirror === "string") return mirror.trim();
  const text = extractMirrorText(mirror)
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
  return text.trim();
}

function lumaDescription(data: Record<string, unknown>, html: string, event: Record<string, unknown>): string {
  const fromMirror = parseDescriptionMirror(data.description_mirror);
  if (fromMirror) return fromMirror;

  const fromEvent = stripHtml(String(event.description ?? event.description_md ?? ""));
  if (fromEvent) return fromEvent;

  return (
    metaContent(html, "og:description") ||
    metaContent(html, "twitter:description") ||
    metaContent(html, "description") ||
    ""
  );
}

function extractLumaPageData(nextData: Record<string, unknown>): Record<string, unknown> | null {
  const props = nextData.props as
    | {
        pageProps?: {
          initialData?: { data?: Record<string, unknown> };
          data?: Record<string, unknown>;
        };
      }
    | undefined;

  return props?.pageProps?.initialData?.data ?? props?.pageProps?.data ?? null;
}

function enrichFromLuma(html: string, url: string): EventEnrichment | null {
  const nextData = parseNextData(html);
  const data = nextData ? extractLumaPageData(nextData) : null;

  const event = (data?.event ?? {}) as Record<string, unknown>;
  const title =
    (typeof event.name === "string" && event.name.trim()) ||
    metaContent(html, "og:title")?.replace(/\s*·\s*Luma\s*$/i, "") ||
    "Event";

  const description = data
    ? lumaDescription(data, html, event)
    : metaContent(html, "og:description") ||
      metaContent(html, "twitter:description") ||
      metaContent(html, "description") ||
      "";

  if (!data) {
    if (!description && title === "Event") return null;
    return {
      title,
      description,
      speakers: [],
      topics: [],
      fetchedAt: new Date().toISOString(),
      source: "luma",
      eventUrl: url,
    };
  }

  const hosts = (Array.isArray(data.hosts) ? data.hosts : []) as LumaPerson[];
  const sessions = (Array.isArray(data.sessions) ? data.sessions : []) as Record<string, unknown>[];
  const attendeeCount =
    typeof data.guest_count === "number"
      ? data.guest_count
      : typeof data.ticket_count === "number"
        ? data.ticket_count
        : undefined;

  const speakers: EventEnrichmentSpeaker[] = [];
  const seen = new Set<string>();

  const pushPerson = (person: EventEnrichmentSpeaker | null) => {
    if (!person) return;
    const key = person.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    speakers.push(person);
  };

  for (const session of sessions) {
    const sessionTitle = typeof session.title === "string" ? session.title : undefined;
    const sessionHosts = (Array.isArray(session.hosts) ? session.hosts : []) as LumaPerson[];
    for (const host of sessionHosts) {
      pushPerson(speakerFromLumaPerson(host, "speaker", sessionTitle));
    }
  }

  for (const host of hosts) {
    pushPerson(speakerFromLumaPerson(host, "host"));
  }

  const categories = (Array.isArray(data.categories) ? data.categories : []) as { name?: string }[];
  const topics = categories
    .map((c) => c.name?.trim())
    .filter((name): name is string => Boolean(name));

  const geo = event.geo_address_info as { city_state?: string; full_address?: string; description?: string } | undefined;
  const meetingNote = geo?.description?.trim();
  const location = [geo?.city_state || geo?.full_address, meetingNote].filter(Boolean).join(" · ") || undefined;

  return {
    title,
    description,
    speakers,
    topics,
    location,
    startAt: typeof data.start_at === "string" ? data.start_at : undefined,
    attendeeCount,
    fetchedAt: new Date().toISOString(),
    source: "luma",
    eventUrl: url,
  };
}

function enrichFromJsonLd(html: string, url: string, source: EventLinkSource): EventEnrichment | null {
  const blocks = parseJsonLd(html);
  const eventBlock = blocks.find((b) => b["@type"] === "Event" || b["@type"] === "EducationEvent");
  if (!eventBlock) return null;

  const title = String(eventBlock.name ?? metaContent(html, "og:title") ?? "Event");
  const description = stripHtml(
    String(eventBlock.description ?? metaContent(html, "og:description") ?? "")
  );

  const performers = Array.isArray(eventBlock.performer)
    ? eventBlock.performer
    : eventBlock.performer
      ? [eventBlock.performer]
      : [];

  const speakers: EventEnrichmentSpeaker[] = performers
    .map((performer) => {
      const p = performer as Record<string, unknown>;
      const name = String(p.name ?? "").trim();
      if (!name) return null;
      const speaker: EventEnrichmentSpeaker = {
        name,
        role: "speaker",
        linkedInUrl: typeof p.url === "string" && p.url.includes("linkedin.com") ? p.url : undefined,
      };
      return speaker;
    })
    .filter((s): s is EventEnrichmentSpeaker => s !== null);

  const locationObj = eventBlock.location as Record<string, unknown> | undefined;
  const location =
    typeof locationObj?.name === "string"
      ? locationObj.name
      : typeof locationObj?.address === "string"
        ? locationObj.address
        : undefined;

  return {
    title,
    description,
    speakers,
    topics: [],
    location,
    startAt: typeof eventBlock.startDate === "string" ? eventBlock.startDate : undefined,
    fetchedAt: new Date().toISOString(),
    source,
    eventUrl: url,
  };
}

function enrichFromMeta(html: string, url: string, source: EventLinkSource): EventEnrichment {
  const title = metaContent(html, "og:title")?.replace(/\s*·\s*Luma\s*$/i, "") ?? "Event";
  const description =
    metaContent(html, "og:description") ??
    metaContent(html, "twitter:description") ??
    metaContent(html, "description") ??
    "";

  return {
    title,
    description,
    speakers: [],
    topics: [],
    fetchedAt: new Date().toISOString(),
    source,
    eventUrl: url,
  };
}

function enrichFromHtml(html: string, url: string, source: EventLinkSource): EventEnrichment {
  if (source === "luma") {
    const luma = enrichFromLuma(html, url);
    if (luma) return luma;
  }

  const jsonLd = enrichFromJsonLd(html, url, source);
  if (jsonLd && (jsonLd.description || jsonLd.speakers.length)) {
    return jsonLd;
  }

  return enrichFromMeta(html, url, source);
}

export async function enrichEventFromUrl(rawUrl: string): Promise<EventEnrichment | null> {
  const linkInfo = parseEventUrl(rawUrl);
  if (!linkInfo) return null;

  const candidates = linkInfo.source === "luma" ? lumaFetchCandidates(linkInfo.url) : [linkInfo.url];
  let lastEnrichment: EventEnrichment | null = null;

  for (const candidate of candidates) {
    const html = await fetchHtml(candidate);
    if (!html) continue;

    const enrichment = enrichFromHtml(html, linkInfo.url, linkInfo.source);
    lastEnrichment = { ...enrichment, eventUrl: linkInfo.url };

    const hasUsefulData =
      enrichment.description.length > 0 ||
      enrichment.speakers.length > 0 ||
      enrichment.topics.length > 0 ||
      (enrichment.title !== "Event" && enrichment.title.length > 0);

    if (hasUsefulData) {
      return lastEnrichment;
    }
  }

  return lastEnrichment;
}
