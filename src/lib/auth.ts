import { createClerkClient, verifyToken } from "@clerk/backend";

export interface RequestAuth {
  userId: string;
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

const PUBLIC_API_PATHS = new Set(["/api/health", "/api/config"]);

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.has(pathname);
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY?.trim());
}

export function getClerkPublishableKey(): string | null {
  const key = process.env.CLERK_PUBLISHABLE_KEY?.trim();
  return key || null;
}

export function getDevUserId(): string {
  return process.env.AUTH_DEV_USER_ID?.trim() || "local-dev";
}

function allowLocalDevBypass(): boolean {
  if (isAuthConfigured()) return false;
  if (process.env.VERCEL) return false;
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

async function isEmailAllowed(userId: string): Promise<boolean> {
  const raw = process.env.AUTH_ALLOWED_EMAILS?.trim();
  if (!raw) return true;

  const allowed = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length) return true;

  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) return true;

  const client = createClerkClient({ secretKey });
  const user = await client.users.getUser(userId);
  const primary = user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId);
  const email = primary?.emailAddress?.trim().toLowerCase();
  if (!email) return false;
  return allowed.includes(email);
}

export async function authenticateRequest(authHeader?: string): Promise<RequestAuth> {
  if (allowLocalDevBypass()) {
    return { userId: getDevUserId() };
  }

  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new AuthError("Authentication is not configured", 503);
  }

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    throw new AuthError("Sign in required");
  }

  try {
    const payload = await verifyToken(token, { secretKey });
    const userId = payload.sub;
    if (!userId) {
      throw new AuthError("Invalid session");
    }

    const allowed = await isEmailAllowed(userId);
    if (!allowed) {
      throw new AuthError("This beta is invite-only. Ask the owner for access.", 403);
    }

    return { userId };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError("Invalid or expired session");
  }
}
