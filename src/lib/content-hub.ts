import type { ContentPlatform, EventSession } from "../models/types.js";
import { resolveSessionTitle } from "./session.js";

export type ContentPieceStatus = "not_started" | "in_progress" | "needs_review" | "reviewed";

export interface PlatformContentItem {
  platform: ContentPlatform;
  draftId?: string;
  status: ContentPieceStatus;
  hasBody: boolean;
}

export interface ContentAngleHubItem {
  id: string;
  angleId: string;
  sessionId: string;
  sessionTitle: string;
  sessionDateLabel: string;
  title: string;
  hook: string;
  insight: string;
  suggestedPlatforms: ContentPlatform[];
  platforms: PlatformContentItem[];
  status: ContentPieceStatus;
}

export interface PlatformGroupItem {
  platform: ContentPlatform;
  platformLabel: string;
  angleId: string;
  angleTitle: string;
  sessionId: string;
  sessionTitle: string;
  status: ContentPieceStatus;
  draftId?: string;
}

export interface ContentHubData {
  angles: ContentAngleHubItem[];
  byPlatform: PlatformGroupItem[];
  counts: {
    notStarted: number;
    inProgress: number;
    needsReview: number;
    reviewed: number;
  };
}

const PLATFORM_LABELS: Record<ContentPlatform, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter",
  newsletter: "Newsletter",
  blog: "Blog",
  substack: "Substack",
  medium: "Medium",
};

export function platformLabel(platform: ContentPlatform): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function platformStatus(
  session: EventSession,
  draft: { body: string } | undefined
): ContentPieceStatus {
  if (!draft?.body?.trim()) return "not_started";
  if (session.stage === "reviewed" || session.stage === "published") return "reviewed";
  if (session.stage === "drafted") return "needs_review";
  return "in_progress";
}

function angleStatus(session: EventSession, angleId: string): ContentPieceStatus {
  const drafts = session.contentDrafts.filter((d) => d.angleId === angleId);
  if (!drafts.length) return "not_started";

  const statuses = drafts.map((d) => platformStatus(session, d));
  if (statuses.every((s) => s === "reviewed")) return "reviewed";
  if (statuses.some((s) => s === "needs_review")) return "needs_review";
  if (statuses.some((s) => s === "in_progress")) return "in_progress";
  return "not_started";
}

export function buildContentHub(sessions: EventSession[]): ContentHubData {
  const angles: ContentAngleHubItem[] = [];

  for (const session of sessions) {
    for (const angle of session.contentAngles ?? []) {
      const draftByPlatform = new Map(
        session.contentDrafts
          .filter((d) => d.angleId === angle.id)
          .map((d) => [d.platform, d])
      );

      const suggested = angle.platforms?.length ? angle.platforms : [...draftByPlatform.keys()];
      const platforms: PlatformContentItem[] = suggested.map((platform) => {
        const draft = draftByPlatform.get(platform);
        return {
          platform,
          draftId: draft?.id,
          status: platformStatus(session, draft),
          hasBody: Boolean(draft?.body?.trim()),
        };
      });

      for (const draft of session.contentDrafts.filter((d) => d.angleId === angle.id)) {
        if (!platforms.some((p) => p.platform === draft.platform)) {
          platforms.push({
            platform: draft.platform,
            draftId: draft.id,
            status: platformStatus(session, draft),
            hasBody: Boolean(draft.body?.trim()),
          });
        }
      }

      angles.push({
        id: `${session.id}:${angle.id}`,
        angleId: angle.id,
        sessionId: session.id,
        sessionTitle: resolveSessionTitle(session),
        sessionDateLabel: formatSessionDate(session.createdAt),
        title: angle.title,
        hook: angle.hook,
        insight: angle.nonObviousInsight,
        suggestedPlatforms: angle.platforms ?? [],
        platforms,
        status: angleStatus(session, angle.id),
      });
    }
  }

  const byPlatform: PlatformGroupItem[] = [];
  for (const item of angles) {
    for (const p of item.platforms) {
      byPlatform.push({
        platform: p.platform,
        platformLabel: platformLabel(p.platform),
        angleId: item.angleId,
        angleTitle: item.title,
        sessionId: item.sessionId,
        sessionTitle: item.sessionTitle,
        status: p.status,
        draftId: p.draftId,
      });
    }
  }

  byPlatform.sort((a, b) => {
    const platformCmp = a.platformLabel.localeCompare(b.platformLabel);
    if (platformCmp !== 0) return platformCmp;
    return a.angleTitle.localeCompare(b.angleTitle);
  });

  const counts = {
    notStarted: angles.filter((a) => a.status === "not_started").length,
    inProgress: angles.filter((a) => a.status === "in_progress").length,
    needsReview: angles.filter((a) => a.status === "needs_review").length,
    reviewed: angles.filter((a) => a.status === "reviewed").length,
  };

  return { angles, byPlatform, counts };
}
