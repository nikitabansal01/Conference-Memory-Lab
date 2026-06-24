import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleApiRoute } from "../../../_handler.js";

export default function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const id = req.query.id;
  const captureRef = req.query.captureRef;
  const sessionId = Array.isArray(id) ? id[0] : id;
  const ref = Array.isArray(captureRef) ? captureRef[0] : captureRef;
  if (!sessionId || !ref) {
    res.status(400).json({ error: "Session id and capture ref required" });
    return Promise.resolve();
  }
  return handleApiRoute(req, res, `/api/sessions/${sessionId}/captures/${ref}`);
}
