import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import {
  loadProgress,
  saveProgress,
  listSessions,
  loadSession,
  saveSession,
  loadProfileOrExample,
  saveProfile,
  loadResume,
  ROOT,
} from "./lib/storage.js";
import {
  TRUST_LEVELS,
  getLevelDefinition,
  xpToNextLevel,
  getCumulativeActions,
} from "./trust/levels.js";
import { formatLevelBadge } from "./gamification/xp.js";
import type { EventSession, EventType, ExpertiseProfile } from "./models/types.js";
import { createSession } from "./lib/session.js";
import { getProfileStatus } from "./lib/profile-status.js";
import { buildActionItems, capabilitiesUnlocked, eventLinkNudge } from "./lib/actions.js";
import { parseEventUrl, isValidEventUrl } from "./lib/event-url.js";

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

const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC_DIR = join(ROOT, "public");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const EVENT_TYPES: EventType[] = ["mixer", "panel", "conference", "webinar", "other"];

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
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

async function handleDashboard(res: ServerResponse): Promise<void> {
  const progress = await loadProgress();
  const sessions = await listSessions();
  const profile = await loadProfileOrExample();
  const resume = await loadResume();
  const levelDef = getLevelDefinition(progress.level);
  const next = xpToNextLevel(progress.totalXp);
  const profileStatus = getProfileStatus(profile, Boolean(resume));
  const featured = await getFeaturedSession(sessions);
  const actions = buildActionItems(sessions, profileStatus, profile);
  const nextLevelDef = next.next ? getLevelDefinition(next.next as import("./models/types.js").TrustLevel) : null;

  sendJson(res, {
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
    sessions: sessions.map((s) => ({
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
  });
}

async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
): Promise<boolean> {
  if (pathname === "/api/dashboard" && req.method === "GET") {
    await handleDashboard(res);
    return true;
  }

  if (pathname === "/api/profile" && req.method === "GET") {
    const profile = await loadProfileOrExample();
    sendJson(res, profile);
    return true;
  }

  if (pathname === "/api/profile" && req.method === "PUT") {
    const body = JSON.parse(await readBody(req)) as Partial<ExpertiseProfile>;
    const existing = await loadProfileOrExample();
    const updated: ExpertiseProfile = {
      ...existing,
      ...body,
      expertiseAreas: body.expertiseAreas ?? existing.expertiseAreas,
      contentPriorities: body.contentPriorities ?? existing.contentPriorities,
      pastPostExamples: body.pastPostExamples ?? existing.pastPostExamples,
    };
    if (!updated.name?.trim()) {
      sendJson(res, { error: "Name is required" }, 400);
      return true;
    }
    await saveProfile(updated);
    const resume = await loadResume();
    sendJson(res, { profile: updated, status: getProfileStatus(updated, Boolean(resume)) });
    return true;
  }

  if (pathname === "/api/sessions" && req.method === "GET") {
    sendJson(res, await listSessions());
    return true;
  }

  if (pathname === "/api/sessions" && req.method === "POST") {
    const body = JSON.parse(await readBody(req)) as {
      title?: string;
      eventType?: EventType;
      rawNotes?: string;
      eventUrl?: string;
      location?: string;
      skipEventLink?: boolean;
    };

    if (!body.title?.trim()) {
      sendJson(res, { error: "Title is required" }, 400);
      return true;
    }
    if (!body.rawNotes?.trim()) {
      sendJson(res, { error: "Notes are required" }, 400);
      return true;
    }
    if (!EVENT_TYPES.includes(body.eventType ?? "mixer")) {
      sendJson(res, { error: "Invalid event type" }, 400);
      return true;
    }

    let eventUrl: string | undefined;
    let eventLinkWarning: string | undefined;

    if (body.eventUrl?.trim()) {
      if (!isValidEventUrl(body.eventUrl)) {
        sendJson(res, { error: "Please enter a valid event URL (Luma, Eventbrite, or conference site)" }, 400);
        return true;
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

    sendJson(res, {
      session,
      eventLinkWarning,
      eventLinkInfo: eventUrl ? parseEventUrl(eventUrl) : null,
    }, 201);
    return true;
  }

  if (pathname.startsWith("/api/sessions/") && req.method === "PATCH") {
    const id = pathname.replace("/api/sessions/", "");
    const sessions = await listSessions();
    const session = sessions.find((s) => s.id.startsWith(id)) ?? (await loadSession(id));

    if (!session) {
      sendJson(res, { error: "Session not found" }, 404);
      return true;
    }

    const body = JSON.parse(await readBody(req)) as { eventUrl?: string };
    if (!body.eventUrl?.trim() || !isValidEventUrl(body.eventUrl)) {
      sendJson(res, { error: "Valid event URL required" }, 400);
      return true;
    }

    const info = parseEventUrl(body.eventUrl)!;
    const updated: EventSession = {
      ...session,
      eventUrl: info.url,
      updatedAt: new Date().toISOString(),
    };
    await saveSession(updated);
    sendJson(res, { session: updated, eventLinkInfo: info });
    return true;
  }

  if (pathname.startsWith("/api/sessions/") && req.method === "GET") {
    const id = pathname.replace("/api/sessions/", "");
    const sessions = await listSessions();
    const session = sessions.find((s) => s.id.startsWith(id)) ?? (await loadSession(id));
    if (!session) {
      sendJson(res, { error: "Session not found" }, 404);
      return true;
    }
    sendJson(res, {
      ...session,
      eventLinkNudge: eventLinkNudge(session),
      eventLinkInfo: session.eventUrl ? parseEventUrl(session.eventUrl) : null,
    });
    return true;
  }

  return false;
}

async function serveStatic(res: ServerResponse, pathname: string): Promise<void> {
  const filePath = join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname);
  try {
    const content = await readFile(filePath);
    const type = MIME[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname.startsWith("/api/")) {
    const handled = await handleApi(req, res, pathname);
    if (handled) return;
    sendJson(res, { error: "Not found" }, 404);
    return;
  }

  if (req.method === "GET") {
    await serveStatic(res, pathname);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`\n  Conference Memory Lab\n  → http://localhost:${PORT}\n`);
});
