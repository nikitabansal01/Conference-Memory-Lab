import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleApiRoute } from "./_handler.js";

function resolvePathname(req: VercelRequest): string {
  const raw = req.url ?? "/";
  const pathname = new URL(raw, "http://localhost").pathname.replace(/\/$/, "") || "/";
  if (pathname.startsWith("/api/")) return pathname;
  const segments = req.query.path;
  const pathParts = Array.isArray(segments) ? segments : segments ? [segments] : [];
  return pathParts.length ? `/api/${pathParts.join("/")}` : "/api/";
}

export default function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  return handleApiRoute(req, res, resolvePathname(req));
}
