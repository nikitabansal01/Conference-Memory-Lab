import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleApiRoute } from "../_handler.js";

export default function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const id = req.query.id;
  const sessionId = Array.isArray(id) ? id[0] : id;
  if (!sessionId) {
    res.status(400).json({ error: "Session id required" });
    return Promise.resolve();
  }
  return handleApiRoute(req, res, `/api/sessions/${sessionId}`);
}
