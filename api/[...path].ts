import type { VercelRequest, VercelResponse } from "@vercel/node";
import { routeApi } from "../src/api/router.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const segments = req.query.path;
  const pathParts = Array.isArray(segments) ? segments : segments ? [segments] : [];
  const pathname = `/api/${pathParts.join("/")}`;

  const result = await routeApi(req.method ?? "GET", pathname, req.body);
  res.status(result.status).json(result.body);
}
