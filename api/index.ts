import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleApiRoute } from "./_handler.js";

function segmentsFromQuery(value: unknown): string[] {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : [value];
  return parts.flatMap((part) => String(part).split("/").filter(Boolean));
}

function buildPathname(req: VercelRequest): string {
  const rewritten = segmentsFromQuery(req.query.path);
  if (rewritten.length) {
    return `/api/${rewritten.map((s) => decodeURIComponent(s)).join("/")}`;
  }

  if (req.url) {
    const path = req.url.split("?")[0];
    if (path.startsWith("/api") && path.length > 4) return path;
  }

  return "/api";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleApiRoute(req, res, buildPathname(req));
}
