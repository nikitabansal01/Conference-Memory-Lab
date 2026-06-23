import { randomUUID } from "node:crypto";
import { writeFile, mkdir, unlink, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import type { CaptureFile, CaptureKind } from "../models/types.js";
import { SESSIONS_DIR } from "./storage.js";

const MAX_CAPTURE_BYTES = 15 * 1024 * 1024;

export function capturesDir(sessionId: string): string {
  return join(SESSIONS_DIR, sessionId, "captures");
}

export function captureKindFromMime(mimeType: string): CaptureKind | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

export async function saveCaptureFile(
  sessionId: string,
  file: Buffer,
  meta: { filename: string; mimeType: string; kind: CaptureKind; caption?: string }
): Promise<CaptureFile> {
  if (file.byteLength > MAX_CAPTURE_BYTES) {
    throw new Error("File must be under 15MB");
  }

  const id = randomUUID();
  const ext = extname(meta.filename) || extFromMime(meta.mimeType);
  const storedName = `${id}${ext}`;
  const dir = capturesDir(sessionId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, storedName), file);

  return {
    id,
    filename: storedName,
    originalName: meta.filename,
    mimeType: meta.mimeType,
    kind: meta.kind,
    caption: meta.caption?.trim() || undefined,
    uploadedAt: new Date().toISOString(),
  };
}

function extFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
  };
  return map[mimeType] ?? "";
}

export async function readCaptureFile(sessionId: string, filename: string): Promise<Buffer> {
  return readFile(join(capturesDir(sessionId), filename));
}

export async function deleteCaptureFile(sessionId: string, filename: string): Promise<void> {
  try {
    await unlink(join(capturesDir(sessionId), filename));
  } catch {
    // File may already be gone
  }
}

export { MAX_CAPTURE_BYTES };
