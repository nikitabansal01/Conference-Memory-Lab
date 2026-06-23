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
    const headers: Record<string, string> = {
      ...result.headers,
    };

    if (result.status >= 300 && result.status < 400 && result.headers?.Location) {
      res.status(result.status);
      for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
      }
      res.end();
      return;
    }

    if (result.raw) {
      if (result.headers?.["Content-Type"]) {
        headers["Content-Type"] = result.headers["Content-Type"];
      }
      res.status(result.status);
      for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
      }
      res.end(result.raw);
      return;
    }
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error(`API error [${pathname}]:`, err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
}
