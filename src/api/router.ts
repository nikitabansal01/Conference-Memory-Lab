import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  loadProgress,
  saveProgress,
  listSessions,
  resolveSession,
  saveSession,
  loadProfileOrExample,
  saveProfile,
  loadResume,
  ROOT,
} from "../lib/storage.js";
import {
  TRUST_LEVELS,
  getLevelDefinition,
  xpToNextLevel,
  getCumulativeActions,
} from "../trust/levels.js";
import { formatLevelBadge } from "../gamification/xp.js";
import type { EventSession, EventType, ExpertiseProfile, TrustLevel } from "../models/types.js";
import { createSession } from "../lib/session.js";
import { getProfileStatus } from "../lib/profile-status.js";
import { buildActionItems, buildAllActionItems, buildSessionActionItems, capabilitiesUnlocked, eventLinkNudge, sessionLoopLabel, sessionNextTab } from "../lib/actions.js";
import { buildContentHub } from "../lib/content-hub.js";
import { parseEventUrl, isValidEventUrl } from "../lib/event-url.js";
import {
  saveCaptureFile,
  readCaptureFile,
  deleteCaptureFile,
  captureKindFromMime,
  MAX_CAPTURE_BYTES,
} from "../lib/captures.js";

const EVENT_TYPES: EventType[] = ["mixer", "panel", "conference", "webinar", "other"];

export interface ApiResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
  raw?: Buffer;
}

function getBiggestIdea(session: EventSession): string | null {
  const nonObvious = session.claims.find((c) => c.text.includes("[non-obvious]"));
  if (nonObvious) return nonObvious.text.replace("[non-obvious] ", "");
  if (session.themes[0]) return session.themes[0].label;
  return null;
}

function getIdeasCount(session: EventSession): number {
  return session.claims.length + session.themes.length + (session.contentAngles?.length ?? 0);
}

function getLensImpact(profile: ExpertiseProfile, featured: EventSession | null): string[] {
  const items: string[] = [];
  if (profile.expertiseAreas.length >= 2) {
    items.push(
      `Prioritized ${profile.expertiseAreas.slice(0, 2).join(" and ")} over generic benchmark talk`
    );
  } else if (profile.expertiseAreas[0]) {
    items.push(`Prioritized ${profile.expertiseAreas[0]} angles`);
  }
  if (featured?.themes.length) {
    const connected = featured.themes.find((t) => t.profileConnection);
    if (connected) {
      items.push(`Connected "${connected.label}" to your current work`);
    }
  }
  items.push("Filtered recap content in favor of non-obvious takeaways");
  if (items.length < 3 && profile.contentPriorities?.[0]) {
    items.push(`Surfaced insights aligned with "${profile.contentPriorities[0]}"`);
  }
  return items.slice(0, 3);
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function getFeaturedSession(sessions: EventSession[]): Promise<EventSession | null> {
  if (sessions[0]) return sessions[0];
  try {
    const raw = await readFile(join(ROOT, "examples/pipeline/full-session.json"), "utf-8");
    return JSON.parse(raw) as EventSession;
  } catch {
    return null;
  }
}

function parseRequestBody(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (typeof body === "string") {
    return body.trim() ? (JSON.parse(body) as Record<string, unknown>) : {};
  }
  if (typeof body === "object") return body as Record<string, unknown>;
  return {};
}

async function handleDashboard(): Promise<ApiResult> {
  const progress = await loadProgress();
  const sessions = await listSessions();
  const profile = await loadProfileOrExample();
  const resume = await loadResume();
  const levelDef = getLevelDefinition(progress.level);
  const next = xpToNextLevel(progress.totalXp);
  const profileStatus = getProfileStatus(profile, Boolean(resume));
  const featured = await getFeaturedSession(sessions);
  const actions = buildActionItems(sessions, profileStatus, profile);
  const allActions = buildAllActionItems(sessions, profile);
  const contentSessions = sessions.length > 0 ? sessions : featured ? [featured] : [];
  const contentHub = buildContentHub(contentSessions);
  const nextLevelDef = next.next ? getLevelDefinition(next.next as TrustLevel) : null;
  const timelineSessions = sessions.length > 0 ? sessions : featured ? [featured] : [];

  return {
    status: 200,
    body: {
      progress: {
        ...progress,
        levelName: levelDef.name,
        levelTagline: levelDef.tagline,
        levelBadge: formatLevelBadge(progress.level, levelDef.name),
        cumulativeActions: getCumulativeActions(progress.level),
        capabilities: capabilitiesUnlocked(progress.level),
        next,
      },
      trustLevels: TRUST_LEVELS.map((l) => ({
        level: l.level,
        name: l.name,
        tagline: l.tagline,
        xpRequired: l.xpRequired,
        unlocked: progress.totalXp >= l.xpRequired,
        current: progress.level === l.level,
      })),
      profile: {
        name: profile.name,
        tagline: profile.tagline,
        currentRole: profile.currentRole,
        education: profile.education,
        expertiseAreas: profile.expertiseAreas,
        contentPriorities: profile.contentPriorities?.slice(0, 3),
        status: profileStatus,
      },
      actions,
      allActions,
      contentHub,
      sessions: timelineSessions.map((s) => ({
        id: s.id,
        title: s.title,
        eventType: s.eventType,
        stage: s.stage,
        createdAt: s.createdAt,
        eventUrl: s.eventUrl,
        hasEventLink: Boolean(s.eventUrl),
        peopleCount: s.people.length,
        claimsCount: s.claims.length,
        ideasCount: getIdeasCount(s),
        dateLabel: formatSessionDate(s.createdAt),
        nextTab: sessionNextTab(s),
        loopLabel: sessionLoopLabel(s),
        pendingCount: buildSessionActionItems(s, profile).length,
      })),
      featuredSession: featured
        ? {
            ...featured,
            eventLinkNudge: eventLinkNudge(featured),
            eventLinkInfo: featured.eventUrl ? parseEventUrl(featured.eventUrl) : null,
            stats: {
              peopleCount: featured.people.length,
              ideasCount: getIdeasCount(featured),
              biggestIdea: getBiggestIdea(featured),
            },
          }
        : null,
      lensImpact: getLensImpact(profile, featured),
      nextUnlock: next.next
        ? {
            level: next.next,
            name: nextLevelDef?.name ?? "",
            tagline: nextLevelDef?.tagline ?? "",
            progressPct: next.progressPct,
          }
        : null,
      primaryAction: actions[0] ?? null,
    },
  };
}

export async function routeApi(
  method: string,
  pathname: string,
  rawBody?: unknown
): Promise<ApiResult> {
  if (pathname === "/api/dashboard" && method === "GET") {
    return handleDashboard();
  }

  if (pathname === "/api/profile" && method === "GET") {
    const profile = await loadProfileOrExample();
    return { status: 200, body: profile };
  }

  if (pathname === "/api/profile" && method === "PUT") {
    const body = parseRequestBody(rawBody) as Partial<ExpertiseProfile>;
    const existing = await loadProfileOrExample();
    const updated: ExpertiseProfile = {
      ...existing,
      ...body,
      expertiseAreas: body.expertiseAreas ?? existing.expertiseAreas,
      contentPriorities: body.contentPriorities ?? existing.contentPriorities,
      pastPostExamples: body.pastPostExamples ?? existing.pastPostExamples,
    };
    if (!updated.name?.trim()) {
      return { status: 400, body: { error: "Name is required" } };
    }
    await saveProfile(updated);
    const resume = await loadResume();
    return {
      status: 200,
      body: { profile: updated, status: getProfileStatus(updated, Boolean(resume)) },
    };
  }

  if (pathname === "/api/sessions" && method === "GET") {
    return { status: 200, body: await listSessions() };
  }

  if (pathname === "/api/sessions" && method === "POST") {
    const body = parseRequestBody(rawBody) as {
      title?: string;
      eventType?: EventType;
      rawNotes?: string;
      eventUrl?: string;
      location?: string;
      skipEventLink?: boolean;
    };

    if (!body.title?.trim()) {
      return { status: 400, body: { error: "Title is required" } };
    }
    if (!body.rawNotes?.trim()) {
      return { status: 400, body: { error: "Notes are required" } };
    }
    if (!EVENT_TYPES.includes(body.eventType ?? "mixer")) {
      return { status: 400, body: { error: "Invalid event type" } };
    }

    let eventUrl: string | undefined;
    let eventLinkWarning: string | undefined;

    if (body.eventUrl?.trim()) {
      if (!isValidEventUrl(body.eventUrl)) {
        return {
          status: 400,
          body: { error: "Please enter a valid event URL (Luma, Eventbrite, or conference site)" },
        };
      }
      eventUrl = parseEventUrl(body.eventUrl)!.url;
    } else if (!body.skipEventLink) {
      eventLinkWarning =
        "No event link added. Adding a Luma, Eventbrite, or conference URL helps Remember speakers and context.";
    }

    const progress = await loadProgress();
    const { session, progress: updated } = createSession({
      title: body.title.trim(),
      eventType: body.eventType ?? "mixer",
      rawNotes: body.rawNotes.trim(),
      eventUrl,
      location: body.location?.trim(),
      userProgress: progress,
    });

    await saveSession(session);
    await saveProgress(updated);

    return {
      status: 201,
      body: {
        session,
        eventLinkWarning,
        eventLinkInfo: eventUrl ? parseEventUrl(eventUrl) : null,
      },
    };
  }

  if (pathname.startsWith("/api/sessions/") && method === "PATCH") {
    const id = pathname.replace("/api/sessions/", "");
    if (id.includes("/")) {
      return { status: 404, body: { error: "Not found" } };
    }

    const session = await resolveSession(id);
    if (!session) {
      return { status: 404, body: { error: "Session not found" } };
    }

    const body = parseRequestBody(rawBody) as {
      eventUrl?: string;
      rawNotes?: string;
      screenshotDescriptions?: string[];
    };

    const hasEventUrl = body.eventUrl !== undefined;
    const hasNotes = body.rawNotes !== undefined;
    const hasScreenshots = body.screenshotDescriptions !== undefined;

    if (!hasEventUrl && !hasNotes && !hasScreenshots) {
      return { status: 400, body: { error: "No valid fields to update" } };
    }

    const updated: EventSession = {
      ...session,
      updatedAt: new Date().toISOString(),
    };

    if (hasEventUrl) {
      if (!body.eventUrl?.trim() || !isValidEventUrl(body.eventUrl)) {
        return { status: 400, body: { error: "Valid event URL required" } };
      }
      updated.eventUrl = parseEventUrl(body.eventUrl)!.url;
    }

    if (hasNotes) {
      updated.rawNotes = String(body.rawNotes ?? "");
    }

    if (hasScreenshots) {
      updated.screenshotDescriptions = Array.isArray(body.screenshotDescriptions)
        ? body.screenshotDescriptions.map(String)
        : session.screenshotDescriptions;
    }

    await saveSession(updated);
    return {
      status: 200,
      body: {
        session: {
          ...updated,
          eventLinkNudge: eventLinkNudge(updated),
          eventLinkInfo: updated.eventUrl ? parseEventUrl(updated.eventUrl) : null,
        },
        eventLinkInfo: updated.eventUrl ? parseEventUrl(updated.eventUrl) : null,
      },
    };
  }

  const capturePathMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/captures\/([^/]+)$/);
  if (capturePathMatch) {
    const [, sessionId, captureRef] = capturePathMatch;
    const session = await resolveSession(sessionId);
    if (!session) {
      return { status: 404, body: { error: "Session not found" } };
    }

    const capture = (session.captures ?? []).find(
      (c) => c.id === captureRef || c.filename === captureRef
    );
    if (!capture) {
      return { status: 404, body: { error: "Capture not found" } };
    }

    if (method === "GET") {
      if (capture.blobUrl) {
        return {
          status: 302,
          body: null,
          headers: { Location: capture.blobUrl },
        };
      }

      try {
        const file = await readCaptureFile(session.id, capture.filename);
        return {
          status: 200,
          body: null,
          raw: file,
          headers: {
            "Content-Type": capture.mimeType,
            "Content-Disposition": `inline; filename="${capture.originalName}"`,
          },
        };
      } catch {
        return { status: 404, body: { error: "Capture file missing" } };
      }
    }

    if (method === "DELETE") {
      await deleteCaptureFile(capture, session.id);
      const updated: EventSession = {
        ...session,
        captures: (session.captures ?? []).filter((c) => c.id !== capture.id),
        screenshotDescriptions: (session.screenshotDescriptions ?? []).filter(
          (d) => d !== capture.caption
        ),
        updatedAt: new Date().toISOString(),
      };
      await saveSession(updated);
      return {
        status: 200,
        body: {
          session: {
            ...updated,
            eventLinkNudge: eventLinkNudge(updated),
            eventLinkInfo: updated.eventUrl ? parseEventUrl(updated.eventUrl) : null,
          },
        },
      };
    }
  }

  const capturePostMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/captures$/);
  if (capturePostMatch && method === "POST") {
    const sessionId = capturePostMatch[1];
    const session = await resolveSession(sessionId);
    if (!session) {
      return { status: 404, body: { error: "Session not found" } };
    }

    const body = parseRequestBody(rawBody) as {
      filename?: string;
      mimeType?: string;
      dataBase64?: string;
      caption?: string;
    };

    if (!body.filename?.trim() || !body.mimeType?.trim() || !body.dataBase64?.trim()) {
      return { status: 400, body: { error: "filename, mimeType, and dataBase64 are required" } };
    }

    const kind = captureKindFromMime(body.mimeType);
    if (!kind) {
      return {
        status: 400,
        body: { error: "Only image, audio, and video files are supported" },
      };
    }

    let file: Buffer;
    try {
      file = Buffer.from(body.dataBase64, "base64");
    } catch {
      return { status: 400, body: { error: "Invalid file data" } };
    }

    if (file.byteLength > MAX_CAPTURE_BYTES) {
      return { status: 400, body: { error: `File must be under ${MAX_CAPTURE_BYTES / (1024 * 1024)}MB` } };
    }

    try {
      const capture = await saveCaptureFile(session.id, file, {
        filename: body.filename.trim(),
        mimeType: body.mimeType.trim(),
        kind,
        caption: body.caption,
      });

      const descriptions = [...(session.screenshotDescriptions ?? [])];
      if (capture.caption) {
        descriptions.push(capture.caption);
      } else if (kind === "image") {
        descriptions.push(`Image: ${capture.originalName}`);
      }

      const updated: EventSession = {
        ...session,
        captures: [...(session.captures ?? []), capture],
        screenshotDescriptions: descriptions,
        updatedAt: new Date().toISOString(),
      };
      await saveSession(updated);

      return {
        status: 201,
        body: {
          capture,
          session: {
            ...updated,
            eventLinkNudge: eventLinkNudge(updated),
            eventLinkInfo: updated.eventUrl ? parseEventUrl(updated.eventUrl) : null,
          },
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      return { status: 400, body: { error: message } };
    }
  }

  if (pathname.startsWith("/api/sessions/") && method === "GET") {
    const id = pathname.replace("/api/sessions/", "");
    if (id.includes("/")) {
      return { status: 404, body: { error: "Not found" } };
    }
    const session = await resolveSession(id);
    if (!session) {
      return { status: 404, body: { error: "Session not found" } };
    }
    return {
      status: 200,
      body: {
        ...session,
        eventLinkNudge: eventLinkNudge(session),
        eventLinkInfo: session.eventUrl ? parseEventUrl(session.eventUrl) : null,
      },
    };
  }

  return { status: 404, body: { error: "Not found" } };
}
