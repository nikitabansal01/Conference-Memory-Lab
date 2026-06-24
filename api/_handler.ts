import type { VercelRequest, VercelResponse } from "@vercel/node";
import { routeApi } from "../src/api/router.js";
import { authenticateRequest, AuthError, isPublicApiPath } from "../src/lib/auth.js";

function setCors(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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
    let auth;
    if (!isPublicApiPath(pathname)) {
      try {
        const header = req.headers.authorization;
        const authHeader = typeof header === "string" ? header : undefined;
        auth = await authenticateRequest(authHeader);
      } catch (err) {
        if (err instanceof AuthError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
    }

    const result = await routeApi(req.method ?? "GET", pathname, req.body, auth);
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
