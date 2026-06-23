import type { VercelRequest, VercelResponse } from "@vercel/node";
import { routeApi } from "../src/api/router.js";

function setCors(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export async function handleApiRoute(
  req: VercelRequest,
  res: VercelResponse,
  pathname: string
): Promise<void> {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const result = await routeApi(req.method ?? "GET", pathname, req.body);
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error(`API error [${pathname}]:`, err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
}
