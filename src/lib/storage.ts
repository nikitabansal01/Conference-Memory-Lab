import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EventSession, ExpertiseProfile, UserProgress } from "../models/types.js";
import { emptyProgress } from "./session.js";
import {
  hasDatabase,
  dbSaveSession,
  dbLoadSession,
  dbListSessions,
  dbLoadState,
  dbSaveState,
} from "./db.js";

function resolveRoot(): string {
  if (process.env.VERCEL) return process.cwd();
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

const ROOT = resolveRoot();
const WRITABLE_ROOT = process.env.VERCEL && !hasDatabase() ? join("/tmp", "cml-data") : ROOT;

export const DATA_DIR = join(WRITABLE_ROOT, "data");
export const SESSIONS_DIR = join(DATA_DIR, "sessions");
export const PROGRESS_FILE = join(DATA_DIR, "progress.json");
export const PROFILE_FILE = hasDatabase()
  ? join(ROOT, "profile", "profile.json")
  : join(WRITABLE_ROOT, "profile", "profile.json");
export const PROFILE_EXAMPLE = join(ROOT, "profile", "profile.example.json");
export const RESUME_FILE = join(ROOT, "profile", "resume.md");

async function ensureDataDirs(): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true });
}

export async function loadProgress(): Promise<UserProgress> {
  if (hasDatabase()) {
    try {
      const data = await dbLoadState("progress");
      if (data) return data as UserProgress;
      return emptyProgress();
    } catch (err) {
      console.error("loadProgress: database unavailable, using defaults", err);
      return emptyProgress();
    }
  }

  await ensureDataDirs();
  try {
    const raw = await readFile(PROGRESS_FILE, "utf-8");
    return JSON.parse(raw) as UserProgress;
  } catch {
    return emptyProgress();
  }
}

export async function saveProgress(progress: UserProgress): Promise<void> {
  if (hasDatabase()) {
    try {
      await dbSaveState("progress", progress);
      return;
    } catch (err) {
      console.error("saveProgress: database unavailable", err);
      return;
    }
  }

  await ensureDataDirs();
  await writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

export async function saveSession(session: EventSession): Promise<void> {
  if (hasDatabase()) {
    await dbSaveSession(session, session.id, session.createdAt, session.updatedAt);
    return;
  }

  await ensureDataDirs();
  const path = join(SESSIONS_DIR, `${session.id}.json`);
  await writeFile(path, JSON.stringify(session, null, 2));
}

export async function loadSession(id: string): Promise<EventSession | null> {
  if (hasDatabase()) {
    const data = await dbLoadSession(id);
    return data ? (data as EventSession) : null;
  }

  try {
    const raw = await readFile(join(SESSIONS_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as EventSession;
  } catch {
    return null;
  }
}

export async function listSessions(): Promise<EventSession[]> {
  if (hasDatabase()) {
    try {
      const rows = await dbListSessions();
      return rows as EventSession[];
    } catch (err) {
      console.error("listSessions: database unavailable, using empty list", err);
      return [];
    }
  }

  await ensureDataDirs();
  try {
    const files = await readdir(SESSIONS_DIR);
    const sessions: EventSession[] = [];
    for (const file of files.filter((f) => f.endsWith(".json"))) {
      const raw = await readFile(join(SESSIONS_DIR, file), "utf-8");
      sessions.push(JSON.parse(raw) as EventSession);
    }
    return sessions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function loadProfile(): Promise<ExpertiseProfile | null> {
  if (hasDatabase()) {
    const data = await dbLoadState("profile");
    return data ? (data as ExpertiseProfile) : null;
  }

  try {
    const raw = await readFile(PROFILE_FILE, "utf-8");
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
};

export async function loadProfileOrExample(): Promise<ExpertiseProfile> {
  try {
    const profile = await loadProfile();
    if (profile) return profile;
    const raw = await readFile(PROFILE_EXAMPLE, "utf-8");
    return JSON.parse(raw) as ExpertiseProfile;
  } catch (err) {
    console.error("loadProfileOrExample: using fallback profile", err);
    return FALLBACK_PROFILE;
  }
}

export async function saveProfile(profile: ExpertiseProfile): Promise<void> {
  if (hasDatabase()) {
    await dbSaveState("profile", profile);
    return;
  }

  await mkdir(dirname(PROFILE_FILE), { recursive: true });
  await writeFile(PROFILE_FILE, JSON.stringify(profile, null, 2));
}

export async function loadExampleSession(): Promise<EventSession | null> {
  try {
    const raw = await readFile(join(ROOT, "examples/pipeline/full-session.json"), "utf-8");
    return JSON.parse(raw) as EventSession;
  } catch {
    return null;
  }
}

export async function resolveSession(id: string): Promise<EventSession | null> {
  const sessions = await listSessions();
  const local = sessions.find((s) => s.id.startsWith(id)) ?? (await loadSession(id));
  if (local) return local;

  const example = await loadExampleSession();
  if (example && (example.id.startsWith(id) || id.startsWith(example.id.slice(0, 8)))) {
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
