import type { EventSession } from "../models/types.js";
import { notesChangedSinceExtract } from "./notes-fingerprint.js";

export function withSessionMeta<T extends EventSession>(session: T): T & { notesStale: boolean } {
  return {
    ...session,
    notesStale: notesChangedSinceExtract(session),
  };
}
