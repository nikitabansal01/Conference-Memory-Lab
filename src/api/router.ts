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
import { createSession, applyEnrichmentTitle, resolveSessionTitle, titleFromEnrichment } from "../lib/session.js";
import { getProfileStatus } from "../lib/profile-status.js";
import { buildActionItems, buildAllActionItems, buildSessionActionItems, capabilitiesUnlocked, eventLinkNudge, sessionLoopLabel, sessionNextTab } from "../lib/actions.js";
import { buildContentHub } from "../lib/content-hub.js";
import { buildCapacitySidebarModel } from "../lib/capacity-display.js";
import { computeLearningStreak } from "../lib/learning-streak.js";
import { normalizeSessionClaims } from "../lib/claims.js";
import {
  mergeOnboardingState,
  normalizeOnboarding,
  shouldShowOnboarding,
} from "../lib/onboarding.js";
import { buildConnectionDrafts } from "../lib/connection-drafts.js";
import { parseEventUrl, isValidEventUrl } from "../lib/event-url.js";
import {
  saveCaptureFile,
  readCaptureFile,
  deleteCaptureFile,
  captureKindFromMime,
  MAX_CAPTURE_BYTES,
} from "../lib/captures.js";
import type { RequestAuth } from "../lib/auth.js";
import { getClerkPublishableKey, isAuthConfigured, getClerkSetupStatus } from "../lib/auth.js";
import { isLlmConfigured } from "../lib/llm.js";
import { runSessionWorkflow, type RunnableWorkflow } from "../lib/run-workflow.js";

const EVENT_TYPES: EventType[] = ["mixer", "panel", "conference", "webinar", "other"];

export interface ApiResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
  raw?: Buffer;
}

function getBiggestIdea(session: EventSession): string | null {
  const nonObvious = session.claims.find((c) => c.text?.includes("[non-obvious]"));
  if (nonObvious?.text) return nonObvious.text.replace(/\[non-obvious\]\s*/i, "");
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

async function enrichEventFromUrl(eventUrl: string) {
  const mod = await import("../lib/event-enrichment.js");
  return mod.enrichEventFromUrl(eventUrl);
}

async function buildEventPreview(session: EventSession) {
  const mod = await import("../lib/event-preview.js");
  return mod.buildEventPreview(session);
}

async function buildEventIntentSuggestions(
  enrichment: NonNullable<EventSession["eventEnrichment"]>,
  profile: ExpertiseProfile
) {
  const mod = await import("../lib/event-intent.js");
  return mod.buildEventIntentSuggestions(enrichment, profile);
}

async function ensureEventEnrichment(session: EventSession, force = false): Promise<EventSession> {
  if (!session.eventUrl) return session;

  const hasCached =
    session.eventEnrichment &&
    (session.eventEnrichment.description || session.eventEnrichment.speakers.length > 0);
  if (!force && hasCached) return session;

  const enrichment = await enrichEventFromUrl(session.eventUrl);
  if (!enrichment) return session;

  return {
    ...session,
    eventEnrichment: enrichment,
    updatedAt: new Date().toISOString(),
  };
}

async function handleDashboard(auth: RequestAuth): Promise<ApiResult> {
  const storedProgress = await loadProgress(auth.userId);
  const sessions = await listSessions(auth.userId);
  const normalized = normalizeOnboarding(storedProgress);
  let progress = normalized.progress;
  if (normalized.shouldPersist) {
    await saveProgress(progress, auth.userId);
  }
  const onboarding = normalized.onboarding;
  const hasUserEvents = sessions.length > 0;
  const profile = await loadProfileOrExample(auth.userId);
  const resume = await loadResume();
  const levelDef = getLevelDefinition(progress.level);
  const next = xpToNextLevel(progress.totalXp);
  const profileStatus = getProfileStatus(profile, Boolean(resume));
  const featured = await getFeaturedSession(sessions);
  const actions = buildActionItems(sessions, profileStatus, profile);
  const allActions = buildAllActionItems(sessions, profile);
  const contentSessions = sessions.length > 0 ? sessions : featured ? [featured] : [];
  const contentHub = buildContentHub(contentSessions);
  const learningStreak = computeLearningStreak(sessions);
  const nextLevelDef = next.next ? getLevelDefinition(next.next as TrustLevel) : null;
  const capacitySidebar = buildCapacitySidebarModel(progress.level, progress.totalXp);
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
      learningStreak,
      capacitySidebar,
      sessions: timelineSessions.map((s) => ({
        id: s.id,
        title: resolveSessionTitle(s),
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
            isSample: !hasUserEvents,
            eventLinkNudge: eventLinkNudge(featured),
            eventLinkInfo: featured.eventUrl ? parseEventUrl(featured.eventUrl) : null,
            stats: {
              peopleCount: featured.people.length,
              ideasCount: getIdeasCount(featured),
              biggestIdea: getBiggestIdea(featured),
            },
          }
        : null,
      hasUserEvents,
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
      onboarding,
      showOnboarding: shouldShowOnboarding(onboarding),
    },
  };
}

export async function routeApi(
  method: string,
  pathname: string,
  rawBody?: unknown,
  auth?: RequestAuth
): Promise<ApiResult> {
  if (pathname === "/api/config" && method === "GET") {
    return {
      status: 200,
      body: {
        clerkPublishableKey: getClerkPublishableKey(),
        authRequired: isAuthConfigured() || Boolean(process.env.VERCEL),
        clerkSetup: getClerkSetupStatus(),
        llmConfigured: isLlmConfigured(),
      },
    };
  }

  if (!auth) {
    return { status: 401, body: { error: "Sign in required" } };
  }

  if (pathname === "/api/dashboard" && method === "GET") {
    return handleDashboard(auth);
  }

  if (pathname === "/api/onboarding" && method === "PATCH") {
    const body = parseRequestBody(rawBody) as Partial<{
      step: number;
      loopSubStep: number;
      completed: boolean;
      skipped: boolean;
      explicit: boolean;
    }>;

    const progress = await loadProgress(auth.userId);
    const onboarding = mergeOnboardingState(progress.onboarding, body);
    const updated = { ...progress, onboarding };
    await saveProgress(updated, auth.userId);

    return {
      status: 200,
      body: {
        onboarding,
        showOnboarding: shouldShowOnboarding(onboarding),
      },
    };
  }

  if (pathname === "/api/profile" && method === "GET") {
    const profile = await loadProfileOrExample(auth.userId);
    return { status: 200, body: profile };
  }

  if (pathname === "/api/profile" && method === "PUT") {
    const body = parseRequestBody(rawBody) as Partial<ExpertiseProfile>;
    const existing = await loadProfileOrExample(auth.userId);
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
    await saveProfile(updated, auth.userId);
    const resume = await loadResume();
    return {
      status: 200,
      body: { profile: updated, status: getProfileStatus(updated, Boolean(resume)) },
    };
  }

  if (pathname === "/api/events/preview-url" && method === "POST") {
    const body = parseRequestBody(rawBody) as { eventUrl?: string };
    if (!body.eventUrl?.trim() || !isValidEventUrl(body.eventUrl)) {
      return { status: 400, body: { error: "Valid event URL required" } };
    }

    const eventUrl = parseEventUrl(body.eventUrl)!.url;
    const enrichment = await enrichEventFromUrl(eventUrl);
    const profile = await loadProfileOrExample(auth.userId);

    if (!enrichment) {
      return {
        status: 200,
        body: {
          eventUrl,
          title: null,
          intentSuggestions: [],
          error: "Could not read this event page yet.",
        },
      };
    }

    const intentSuggestions = buildEventIntentSuggestions(enrichment, profile);

    return {
      status: 200,
      body: {
        eventUrl,
        title: enrichment.title,
        description: enrichment.description,
        location: enrichment.location,
        attendeeCount: enrichment.attendeeCount,
        hosts: enrichment.speakers.filter((s) => s.role === "host"),
        intentSuggestions,
      },
    };
  }

  if (pathname === "/api/sessions" && method === "GET") {
    return { status: 200, body: await listSessions(auth.userId) };
  }

  if (pathname === "/api/sessions" && method === "POST") {
    const body = parseRequestBody(rawBody) as {
      title?: string;
      eventType?: EventType;
      rawNotes?: string;
      eventUrl?: string;
      location?: string;
      skipEventLink?: boolean;
      attendanceIntent?: string;
    };

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

    if (!body.title?.trim() && !eventUrl) {
      return { status: 400, body: { error: "Add an event page link or enter a title" } };
    }
    if (!body.rawNotes?.trim()) {
      return { status: 400, body: { error: "Notes are required" } };
    }
    if (!EVENT_TYPES.includes(body.eventType ?? "mixer")) {
      return { status: 400, body: { error: "Invalid event type" } };
    }

    const progress = await loadProgress(auth.userId);
    let updatedProgress = progress;

    let enrichment = null;
    if (eventUrl) {
      enrichment = await enrichEventFromUrl(eventUrl);
    }

    const sessionTitle =
      titleFromEnrichment(enrichment) || body.title?.trim() || "Event";

    const { session, progress: updated } = createSession({
      title: sessionTitle,
      eventType: body.eventType ?? "mixer",
      rawNotes: body.rawNotes.trim(),
      eventUrl,
      location: body.location?.trim() || enrichment?.location,
      userProgress: progress,
    });
    updatedProgress = updated;
    let savedSession: EventSession = enrichment
      ? { ...session, eventEnrichment: enrichment, userId: auth.userId }
      : { ...session, userId: auth.userId };

    if (body.attendanceIntent?.trim()) {
      savedSession = { ...savedSession, attendanceIntent: body.attendanceIntent.trim() };
    }

    await saveSession(savedSession, auth.userId);
    await saveProgress(updatedProgress, auth.userId);

    const profile = await loadProfileOrExample(auth.userId);
    const intentSuggestions = savedSession.eventEnrichment
      ? buildEventIntentSuggestions(savedSession.eventEnrichment, profile)
      : [];

    return {
      status: 201,
      body: {
        session: savedSession,
        eventLinkWarning,
        eventLinkInfo: eventUrl ? parseEventUrl(eventUrl) : null,
        eventPreview: buildEventPreview(savedSession),
        intentSuggestions,
      },
    };
  }

  if (pathname.startsWith("/api/sessions/") && method === "PATCH") {
    const id = pathname.replace("/api/sessions/", "");
    if (id.includes("/")) {
      return { status: 404, body: { error: "Not found" } };
    }

    const session = await resolveSession(id, auth.userId);
    if (!session || (session.userId && session.userId !== auth.userId)) {
      return { status: 404, body: { error: "Session not found" } };
    }

    const body = parseRequestBody(rawBody) as {
      eventUrl?: string;
      rawNotes?: string;
      screenshotDescriptions?: string[];
      attendanceIntent?: string;
    };

    const hasEventUrl = body.eventUrl !== undefined;
    const hasNotes = body.rawNotes !== undefined;
    const hasScreenshots = body.screenshotDescriptions !== undefined;
    const hasIntent = body.attendanceIntent !== undefined;

    if (!hasEventUrl && !hasNotes && !hasScreenshots && !hasIntent) {
      return { status: 400, body: { error: "No valid fields to update" } };
    }

    const updated: EventSession = {
      ...session,
      userId: auth.userId,
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

    if (hasIntent) {
      updated.attendanceIntent = String(body.attendanceIntent ?? "").trim();
    }

    await saveSession(updated, auth.userId);
    let savedSession = updated;
    if (hasEventUrl) {
      savedSession = applyEnrichmentTitle(await ensureEventEnrichment(updated, true));
      await saveSession(savedSession, auth.userId);
    }

    const profile = await loadProfileOrExample(auth.userId);
    const preview = buildEventPreview(savedSession);
    const intentSuggestions = savedSession.eventEnrichment
      ? buildEventIntentSuggestions(savedSession.eventEnrichment, profile)
      : [];

    return {
      status: 200,
      body: {
        session: {
          ...savedSession,
          eventLinkNudge: eventLinkNudge(savedSession),
          eventLinkInfo: savedSession.eventUrl ? parseEventUrl(savedSession.eventUrl) : null,
        },
        eventLinkInfo: savedSession.eventUrl ? parseEventUrl(savedSession.eventUrl) : null,
        eventPreview: preview,
        intentSuggestions,
      },
    };
  }

  const capturePathMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/captures\/([^/]+)$/);
  if (capturePathMatch) {
    const [, sessionId, captureRef] = capturePathMatch;
    const session = await resolveSession(sessionId, auth.userId);
    if (!session || (session.userId && session.userId !== auth.userId)) {
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
      await saveSession(updated, auth.userId);
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
    const session = await resolveSession(sessionId, auth.userId);
    if (!session || (session.userId && session.userId !== auth.userId)) {
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
      const capture = await saveCaptureFile(session.id, auth.userId, file, {
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
        userId: auth.userId,
        captures: [...(session.captures ?? []), capture],
        screenshotDescriptions: descriptions,
        updatedAt: new Date().toISOString(),
      };
      await saveSession(updated, auth.userId);

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

  const workflowMatch = pathname.match(
    /^\/api\/sessions\/([^/]+)\/workflows\/(extract|synthesize|draft|self-critique)$/
  );
  if (workflowMatch && method === "POST") {
    const [, sessionId, workflowName] = workflowMatch;
    const workflow = workflowName as RunnableWorkflow;
    const session = await resolveSession(sessionId, auth.userId);
    if (!session || (session.userId && session.userId !== auth.userId)) {
      return { status: 404, body: { error: "Session not found" } };
    }

    try {
      const result = await runSessionWorkflow(workflow, session, auth.userId);
      const profile = await loadProfileOrExample(auth.userId);
      const normalizedSession = normalizeSessionClaims(result.session);
      return {
        status: 200,
        body: {
          session: {
            ...normalizedSession,
            eventLinkNudge: eventLinkNudge(normalizedSession),
            eventLinkInfo: normalizedSession.eventUrl ? parseEventUrl(normalizedSession.eventUrl) : null,
            connectionDrafts: buildConnectionDrafts(normalizedSession, profile),
          },
          xpAwarded: result.xpAwarded,
          leveledUp: result.leveledUp,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Workflow failed";
      const status = message.includes("not configured") ? 503 : 400;
      return { status, body: { error: message } };
    }
  }

  if (pathname.match(/^\/api\/sessions\/[^/]+\/enrich-event$/) && method === "POST") {
    const id = pathname.match(/^\/api\/sessions\/([^/]+)\/enrich-event$/)?.[1];
    if (!id) {
      return { status: 400, body: { error: "Session id required" } };
    }
    const session = await resolveSession(id, auth.userId);
    if (!session || (session.userId && session.userId !== auth.userId)) {
      return { status: 404, body: { error: "Session not found" } };
    }
    if (!session.eventUrl) {
      return { status: 400, body: { error: "No event URL on this session" } };
    }

    const enriched = applyEnrichmentTitle(await ensureEventEnrichment(session, true));
    await saveSession(enriched, auth.userId);
    const preview = buildEventPreview(enriched);
    const profile = await loadProfileOrExample(auth.userId);
    const intentSuggestions = enriched.eventEnrichment
      ? buildEventIntentSuggestions(enriched.eventEnrichment, profile)
      : [];

    return {
      status: 200,
      body: {
        session: {
          ...enriched,
          eventLinkNudge: eventLinkNudge(enriched),
          eventLinkInfo: parseEventUrl(enriched.eventUrl!),
        },
        eventPreview: preview,
        intentSuggestions,
      },
    };
  }

  if (pathname.startsWith("/api/sessions/") && method === "GET") {
    const id = pathname.replace("/api/sessions/", "");
    if (id.includes("/")) {
      return { status: 404, body: { error: "Not found" } };
    }
    const session = await resolveSession(id, auth.userId);
    if (!session || (session.userId && session.userId !== auth.userId)) {
      return { status: 404, body: { error: "Session not found" } };
    }
    const profile = await loadProfileOrExample(auth.userId);
    const normalizedSession = normalizeSessionClaims(session);
    return {
      status: 200,
      body: {
        ...normalizedSession,
        eventLinkNudge: eventLinkNudge(normalizedSession),
        eventLinkInfo: normalizedSession.eventUrl ? parseEventUrl(normalizedSession.eventUrl) : null,
        connectionDrafts: buildConnectionDrafts(normalizedSession, profile),
      },
    };
  }

  return { status: 404, body: { error: "Not found" } };
}
