import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleApiRoute } from "./_handler.js";

function buildPathname(req: VercelRequest): string {
  const segments = req.query.path;
  if (!segments) return "/api";
  const parts = Array.isArray(segments) ? segments : [segments];
  return `/api/${parts.map((s) => decodeURIComponent(String(s))).join("/")}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleApiRoute(req, res, buildPathname(req));
}
