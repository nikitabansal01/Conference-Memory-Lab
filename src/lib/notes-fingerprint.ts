import { createHash } from "node:crypto";
import type { EventSession } from "../models/types.js";

export function notesFingerprint(notes: string): string {
  return createHash("sha256").update(notes.trim()).digest("hex").slice(0, 16);
}

/** Fingerprint of all Attend capture inputs used by Remember. */
export function captureInputFingerprint(session: EventSession): string {
  const combined = [
    session.rawNotes ?? "",
    session.eventTranscript ?? "",
    session.organizedNotes ?? "",
  ].join("\n---\n");
  return notesFingerprint(combined);
}

export function notesChangedSinceExtract(session: EventSession): boolean {
  if (!session.extractedNotesFingerprint?.trim()) return false;
  const current = captureInputFingerprint(session);
  return current !== session.extractedNotesFingerprint;
}
