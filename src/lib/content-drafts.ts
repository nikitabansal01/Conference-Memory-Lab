import type { Claim, ContentAngle, ContentDraft, EventSession, Theme } from "../models/types.js";
import { claimTextFromRaw } from "./claims.js";

const CONTENT_PLATFORMS = ["linkedin", "twitter", "newsletter", "blog", "substack", "medium"] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function normalizeContentAngles(raw: unknown, themes: Theme[]): ContentAngle[] {
  const items = Array.isArray(raw) ? raw : [];
  const angles = items
    .map((item, i) => {
      const record = asRecord(item);
      const platforms = Array.isArray(record.platforms)
        ? record.platforms
            .map(String)
            .filter((p): p is ContentAngle["platforms"][number] =>
              (CONTENT_PLATFORMS as readonly string[]).includes(p)
            )
        : [];
      return {
        id: typeof record.id === "string" && record.id ? record.id : `angle-${i + 1}`,
        title: String(record.title ?? "").trim(),
        hook: String(record.hook ?? "").trim(),
        nonObviousInsight: String(record.nonObviousInsight ?? "").trim(),
        rationale: String(record.rationale ?? "").trim(),
        expertiseLens: Array.isArray(record.expertiseLens) ? record.expertiseLens.map(String) : [],
        platforms: platforms.length ? platforms : (["linkedin"] as ContentAngle["platforms"]),
        predictedAudience: String(record.predictedAudience ?? "").trim(),
        claimIds: Array.isArray(record.claimIds) ? record.claimIds.map(String) : [],
      };
    })
    .filter((a) => a.title || a.nonObviousInsight || a.hook);

  if (angles.length) return angles;
  return themes.filter((t) => t.label?.trim()).map((theme, i) => anglesFromTheme(theme, i));
}

function anglesFromTheme(theme: Theme, index: number): ContentAngle {
  return {
    id: `angle-from-${theme.id || `theme-${index + 1}`}`,
    title: theme.label,
    hook: theme.profileConnection ?? theme.label,
    nonObviousInsight: theme.profileConnection ?? theme.label,
    rationale: `Derived from Think theme: ${theme.label}`,
    expertiseLens: [],
    platforms: ["linkedin"],
    predictedAudience: "",
    claimIds: Array.isArray(theme.claimIds) ? theme.claimIds : [],
  };
}

function claimText(claim: Claim): string {
  return claimTextFromRaw(claim) || String(claim.text ?? "").trim();
}

function claimSnippet(claims: Claim[], claimIds: string[]): string {
  const texts = claimIds
    .map((id) => claims.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => claimText(c!))
    .filter(Boolean)
    .slice(0, 2);
  return texts.join(" ");
}

export function buildThemeLinkedInDraft(
  theme: Theme,
  angle: ContentAngle | undefined,
  claims: Claim[]
): string {
  const headline = angle?.title || theme.label;
  const insight =
    angle?.nonObviousInsight ||
    angle?.hook ||
    theme.profileConnection ||
    theme.label;
  const evidence = claimSnippet(claims, angle?.claimIds?.length ? angle.claimIds : theme.claimIds ?? []);
  const paragraphs = [headline, "", insight];
  if (evidence) {
    paragraphs.push("", `From the event: ${evidence}`);
  }
  paragraphs.push("", "What's your take — does this match what you saw?");
  return paragraphs.join("\n").trim();
}

export function normalizeContentDrafts(
  raw: unknown,
  angles: ContentAngle[],
  themes: Theme[],
  claims: Claim[]
): ContentDraft[] {
  const items = Array.isArray(raw) ? raw : [];
  const drafts = items
    .map((item, i) => {
      const record = asRecord(item);
      const platformRaw = String(record.platform ?? "linkedin");
      const platform = (CONTENT_PLATFORMS as readonly string[]).includes(platformRaw)
        ? (platformRaw as ContentDraft["platform"])
        : "linkedin";
      return {
        id: typeof record.id === "string" && record.id ? record.id : `draft-${i + 1}`,
        angleId: String(record.angleId ?? ""),
        platform,
        body: String(record.body ?? "").trim(),
        reasoningTrace: Array.isArray(record.reasoningTrace) ? record.reasoningTrace.map(String) : [],
      };
    })
    .filter((d) => d.body);

  const linkedInDrafts = drafts.filter((d) => d.platform === "linkedin");
  if (linkedInDrafts.length) {
    return drafts;
  }

  const sources = angles.length ? angles : themes.filter((t) => t.label?.trim());
  if (!sources.length) return drafts;

  const generated = sources.slice(0, 3).map((source, i) => {
    const isAngle = "title" in source;
    const angle = isAngle ? (source as ContentAngle) : undefined;
    const theme = isAngle
      ? themes.find((t) => t.id === angle?.claimIds?.[0]) ?? themes[i]
      : (source as Theme);
    const themeRef = theme ?? { id: `theme-${i + 1}`, label: isAngle ? (source as ContentAngle).title : "", claimIds: [] };
    const angleRef = angle ?? anglesFromTheme(themeRef, i);
    return {
      id: `draft-linkedin-${angleRef.id}`,
      angleId: angleRef.id,
      platform: "linkedin" as const,
      body: buildThemeLinkedInDraft(themeRef, angleRef, claims),
      reasoningTrace: [`Generated from theme: ${angleRef.title}`],
    };
  });

  return [...drafts, ...generated];
}

export function finalizeDraftWorkflowOutput(
  session: EventSession,
  update: Partial<EventSession>
): Partial<EventSession> {
  const themes = (update.themes ?? session.themes ?? []).filter((t) => t.label?.trim());
  const claims = update.claims ?? session.claims ?? [];
  const angles = normalizeContentAngles(update.contentAngles, themes);
  const contentDrafts = normalizeContentDrafts(update.contentDrafts, angles, themes, claims);

  return {
    ...update,
    contentAngles: angles,
    contentDrafts,
    followUpDrafts: Array.isArray(update.followUpDrafts) ? update.followUpDrafts : session.followUpDrafts ?? [],
  };
}
