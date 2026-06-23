export type EventLinkSource = "luma" | "eventbrite" | "partiful" | "conference" | "other" | "unknown";

export interface EventLinkInfo {
  url: string;
  source: EventLinkSource;
  label: string;
}

const PATTERNS: { source: EventLinkSource; label: string; test: RegExp }[] = [
  { source: "luma", label: "Luma", test: /lu\.ma|luma\.com/i },
  { source: "eventbrite", label: "Eventbrite", test: /eventbrite\.com/i },
  { source: "partiful", label: "Partiful", test: /partiful\.com/i },
  { source: "conference", label: "Conference site", test: /\.(org|edu|io)\//i },
];

export function parseEventUrl(raw: string): EventLinkInfo | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const href = url.href;
    const match = PATTERNS.find((p) => p.test.test(href));
    return {
      url: href,
      source: match?.source ?? "other",
      label: match?.label ?? "Event page",
    };
  } catch {
    return null;
  }
}

export function isValidEventUrl(raw: string): boolean {
  return parseEventUrl(raw) !== null;
}
