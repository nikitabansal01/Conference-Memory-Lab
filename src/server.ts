import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { routeApi } from "./api/router.js";
import { ROOT } from "./lib/storage.js";

const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC_DIR = join(ROOT, "public");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

async function serveStatic(res: ServerResponse, pathname: string): Promise<void> {
  const filePath = join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname);
  try {
    const content = await readFile(filePath);
    const type = MIME[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname.startsWith("/api/")) {
    const body = req.method !== "GET" && req.method !== "HEAD" ? await readBody(req) : undefined;
    const result = await routeApi(req.method ?? "GET", pathname, body);
    const headers: Record<string, string> = {
      "Content-Type": result.raw ? (result.headers?.["Content-Type"] ?? "application/octet-stream") : "application/json; charset=utf-8",
      ...result.headers,
    };
    res.writeHead(result.status, headers);
    if (result.raw) {
      res.end(result.raw);
    } else {
      res.end(JSON.stringify(result.body));
    }
    return;
  }

  if (req.method === "GET") {
    await serveStatic(res, pathname);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`\n  Conference Memory Lab\n  → http://localhost:${PORT}\n`);
});
