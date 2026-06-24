import type { Claim } from "../models/types.js";

export function claimTextFromRaw(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (!raw || typeof raw !== "object") return "";

  const record = raw as Record<string, unknown>;
  const value =
    record.text ??
    record.statement ??
    record.content ??
    record.claim ??
    record.description ??
    record.summary ??
    record.insight ??
    record.title ??
    "";

  const text = String(value).trim();
  if (text) return text;

  const sources = record.sources;
  if (Array.isArray(sources)) {
    for (const source of sources) {
      if (!source || typeof source !== "object") continue;
      const ref = source as Record<string, unknown>;
      const excerpt = ref.excerpt ?? ref.ref;
      if (excerpt && String(excerpt).trim()) return String(excerpt).trim();
    }
  }

  return "";
}

export function normalizeClaims(rawClaims: unknown[] | undefined): Claim[] {
  const normalized: Claim[] = [];

  for (const [i, entry] of (rawClaims ?? []).entries()) {
    const text = claimTextFromRaw(entry);
    if (!text) continue;

    const record =
      entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const id = typeof record.id === "string" && record.id ? record.id : `claim-${i + 1}`;
    const confidence: Claim["confidence"] =
      record.confidence === "high" || record.confidence === "low"
        ? record.confidence
        : "medium";

    normalized.push({
      id,
      text,
      confidence,
      sources: Array.isArray(record.sources) ? (record.sources as Claim["sources"]) : [],
      ...(typeof record.themeId === "string" ? { themeId: record.themeId } : {}),
    });
  }

  return normalized;
}

export function normalizeSessionClaims<T extends { claims?: unknown[] }>(session: T): T {
  if (!session.claims?.length) return session;
  return { ...session, claims: normalizeClaims(session.claims) };
}
