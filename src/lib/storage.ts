import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EventSession, ExpertiseProfile, UserProgress } from "../models/types.js";
import { emptyProgress } from "./session.js";
import { getDevUserId } from "./auth.js";
import {
  hasDatabase,
  dbSaveSession,
  dbLoadSession,
  dbListSessions,
  dbLoadState,
  dbSaveState,
  userStateKey,
} from "./db.js";

function resolveRoot(): string {
  if (process.env.VERCEL) return process.cwd();
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

const ROOT = resolveRoot();
const WRITABLE_ROOT = process.env.VERCEL && !hasDatabase() ? join("/tmp", "cml-data") : ROOT;

export const DATA_DIR = join(WRITABLE_ROOT, "data");
export const SESSIONS_DIR = join(DATA_DIR, "sessions");
export const USERS_DIR = join(DATA_DIR, "users");
export const PROFILE_EXAMPLE = join(ROOT, "profile", "profile.example.json");
export const RESUME_FILE = join(ROOT, "profile", "resume.md");

function userDir(userId: string): string {
  return join(USERS_DIR, userId);
}

function progressFile(userId: string): string {
  return join(userDir(userId), "progress.json");
}

function profileFile(userId: string): string {
  return join(userDir(userId), "profile.json");
}

async function ensureUserDir(userId: string): Promise<void> {
  await mkdir(userDir(userId), { recursive: true });
}

async function ensureSessionsDir(): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true });
}

export async function loadProgress(userId: string): Promise<UserProgress> {
  if (hasDatabase()) {
    try {
      const data = await dbLoadState(userStateKey("progress", userId));
      if (data) return data as UserProgress;
      return emptyProgress();
    } catch (err) {
      console.error("loadProgress: database unavailable, using defaults", err);
      return emptyProgress();
    }
  }

  await ensureUserDir(userId);
  try {
    const raw = await readFile(progressFile(userId), "utf-8");
    return JSON.parse(raw) as UserProgress;
  } catch {
    return emptyProgress();
  }
}

export async function saveProgress(progress: UserProgress, userId: string): Promise<void> {
  if (hasDatabase()) {
    try {
      await dbSaveState(userStateKey("progress", userId), progress);
      return;
    } catch (err) {
      console.error("saveProgress: database unavailable", err);
      return;
    }
  }

  await ensureUserDir(userId);
  await writeFile(progressFile(userId), JSON.stringify(progress, null, 2));
}

export async function saveSession(session: EventSession, userId: string): Promise<void> {
  const withUser: EventSession = { ...session, userId };

  if (hasDatabase()) {
    await dbSaveSession(withUser, withUser.id, userId, withUser.createdAt, withUser.updatedAt);
    return;
  }

  await ensureSessionsDir();
  const path = join(SESSIONS_DIR, `${withUser.id}.json`);
  await writeFile(path, JSON.stringify(withUser, null, 2));
}

export async function loadSession(id: string, userId: string): Promise<EventSession | null> {
  if (hasDatabase()) {
    const data = await dbLoadSession(id, userId);
    return data ? (data as EventSession) : null;
  }

  try {
    const raw = await readFile(join(SESSIONS_DIR, `${id}.json`), "utf-8");
    const session = JSON.parse(raw) as EventSession;
    if (session.userId && session.userId !== userId) return null;
    return session;
  } catch {
    return null;
  }
}

export async function listSessions(userId: string): Promise<EventSession[]> {
  if (hasDatabase()) {
    try {
      const rows = await dbListSessions(userId);
      return rows as EventSession[];
    } catch (err) {
      console.error("listSessions: database unavailable, using empty list", err);
      return [];
    }
  }

  await ensureSessionsDir();
  try {
    const files = await readdir(SESSIONS_DIR);
    const sessions: EventSession[] = [];
    for (const file of files.filter((f) => f.endsWith(".json"))) {
      const raw = await readFile(join(SESSIONS_DIR, file), "utf-8");
      const session = JSON.parse(raw) as EventSession;
      if (session.userId && session.userId !== userId) continue;
      if (!session.userId && userId !== getDevUserId()) continue;
      sessions.push(session);
    }
    return sessions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function loadProfile(userId: string): Promise<ExpertiseProfile | null> {
  if (hasDatabase()) {
    const data = await dbLoadState(userStateKey("profile", userId));
    return data ? (data as ExpertiseProfile) : null;
  }

  try {
    const raw = await readFile(profileFile(userId), "utf-8");
    return JSON.parse(raw) as ExpertiseProfile;
  } catch {
    return null;
  }
}

const FALLBACK_PROFILE: ExpertiseProfile = {
  name: "You",
  tagline: "",
  expertiseAreas: [],
  industries: [],
  voiceTraits: [],
  avoidPatterns: [],
  pastPostExamples: [],
  contentPriorities: [],
  assumptionPatterns: [],
  learnings: [],
};

export async function loadProfileOrExample(userId: string): Promise<ExpertiseProfile> {
  try {
    const profile = await loadProfile(userId);
    if (profile) return profile;
    const raw = await readFile(PROFILE_EXAMPLE, "utf-8");
    return JSON.parse(raw) as ExpertiseProfile;
  } catch (err) {
    console.error("loadProfileOrExample: using fallback profile", err);
    return FALLBACK_PROFILE;
  }
}

export async function saveProfile(profile: ExpertiseProfile, userId: string): Promise<void> {
  if (hasDatabase()) {
    await dbSaveState(userStateKey("profile", userId), profile);
    return;
  }

  await ensureUserDir(userId);
  await writeFile(profileFile(userId), JSON.stringify(profile, null, 2));
}

export const SAMPLE_SESSION_ALIAS = "sample-sf-llm-eval-mixer";

export async function loadExampleSession(): Promise<EventSession | null> {
  try {
    const raw = await readFile(join(ROOT, "examples/pipeline/full-session.json"), "utf-8");
    return JSON.parse(raw) as EventSession;
  } catch {
    return null;
  }
}

export async function resolveSession(id: string, userId: string): Promise<EventSession | null> {
  const sessions = await listSessions(userId);
  const local = sessions.find((s) => s.id.startsWith(id)) ?? (await loadSession(id, userId));
  if (local) return local;

  const example = await loadExampleSession();
  if (
    example &&
    (id === SAMPLE_SESSION_ALIAS ||
      example.id === id ||
      example.id.startsWith(id) ||
      id.startsWith(example.id.slice(0, 8)))
  ) {
    return example;
  }
  return null;
}

export async function loadResume(): Promise<string | null> {
  try {
    return await readFile(RESUME_FILE, "utf-8");
  } catch {
    return null;
  }
}

export { ROOT };
