import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleApiRoute } from "./_handler.js";

export default function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  return handleApiRoute(req, res, "/api/sessions");
}
