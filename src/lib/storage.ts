import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EventSession, ExpertiseProfile, UserProgress } from "../models/types.js";
import { emptyProgress } from "./session.js";

function resolveRoot(): string {
  if (process.env.VERCEL) return process.cwd();
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

const ROOT = resolveRoot();
const WRITABLE_ROOT = process.env.VERCEL ? join("/tmp", "cml-data") : ROOT;

export const DATA_DIR = join(WRITABLE_ROOT, "data");
export const SESSIONS_DIR = join(DATA_DIR, "sessions");
export const PROGRESS_FILE = join(DATA_DIR, "progress.json");
export const PROFILE_FILE = process.env.VERCEL
  ? join(WRITABLE_ROOT, "profile.json")
  : join(ROOT, "profile", "profile.json");
export const PROFILE_EXAMPLE = join(ROOT, "profile", "profile.example.json");
export const RESUME_FILE = join(ROOT, "profile", "resume.md");

async function ensureDataDirs(): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true });
}

export async function loadProgress(): Promise<UserProgress> {
  await ensureDataDirs();
  try {
    const raw = await readFile(PROGRESS_FILE, "utf-8");
    return JSON.parse(raw) as UserProgress;
  } catch {
    return emptyProgress();
  }
}

export async function saveProgress(progress: UserProgress): Promise<void> {
  await ensureDataDirs();
  await writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

export async function saveSession(session: EventSession): Promise<void> {
  await ensureDataDirs();
  const path = join(SESSIONS_DIR, `${session.id}.json`);
  await writeFile(path, JSON.stringify(session, null, 2));
}

export async function loadSession(id: string): Promise<EventSession | null> {
  try {
    const raw = await readFile(join(SESSIONS_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw) as EventSession;
  } catch {
    return null;
  }
}

export async function listSessions(): Promise<EventSession[]> {
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
  try {
    const raw = await readFile(PROFILE_FILE, "utf-8");
    return JSON.parse(raw) as ExpertiseProfile;
  } catch {
    return null;
  }
}

export async function loadProfileOrExample(): Promise<ExpertiseProfile> {
  const profile = await loadProfile();
  if (profile) return profile;
  const raw = await readFile(PROFILE_EXAMPLE, "utf-8");
  return JSON.parse(raw) as ExpertiseProfile;
}

export async function saveProfile(profile: ExpertiseProfile): Promise<void> {
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
