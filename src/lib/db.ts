import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

let sql: NeonQueryFunction<false, false> | null = null;
let schemaReady: Promise<void> | null = null;

export function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL
  );
}

export function hasDatabase(): boolean {
  const url = getDatabaseUrl()?.trim();
  if (!url) return false;
  if (/@host(\/|:|$)/i.test(url) || /user:pass@/i.test(url)) return false;
  return true;
}

function normalizeDatabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("postgres://")) {
    return trimmed.replace("postgres://", "postgresql://");
  }
  return trimmed;
}

function getSql(): NeonQueryFunction<false, false> {
  const raw = getDatabaseUrl();
  if (!raw) throw new Error("DATABASE_URL is not configured");
  const url = normalizeDatabaseUrl(raw);
  if (!sql) sql = neon(url);
  return sql;
}

export async function ensureSchema(): Promise<void> {
  if (!hasDatabase()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      const query = getSql();
      await query`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `;
      await query`
        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `;
      await query`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id TEXT`;
      await query`CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id)`;
    })();
  }
  await schemaReady;
}

export async function dbSaveSession(
  session: unknown,
  id: string,
  userId: string,
  createdAt: string,
  updatedAt: string
): Promise<void> {
  await ensureSchema();
  const query = getSql();
  const payload = JSON.stringify(session);
  await query`
    INSERT INTO sessions (id, user_id, data, created_at, updated_at)
    VALUES (${id}, ${userId}, ${payload}::jsonb, ${createdAt}, ${updatedAt})
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      data = EXCLUDED.data,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function dbLoadSession(id: string, userId: string): Promise<unknown | null> {
  await ensureSchema();
  const query = getSql();
  const rows = await query`
    SELECT data FROM sessions
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `;
  if (!rows.length) return null;
  return rows[0].data;
}

export async function dbListSessions(userId: string): Promise<unknown[]> {
  await ensureSchema();
  const query = getSql();
  const rows = await query`
    SELECT data FROM sessions
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
  return rows.map((row) => row.data);
}

export async function dbLoadState(key: string): Promise<unknown | null> {
  await ensureSchema();
  const query = getSql();
  const rows = await query`SELECT data FROM app_state WHERE key = ${key} LIMIT 1`;
  if (!rows.length) return null;
  return rows[0].data;
}

export async function dbSaveState(key: string, data: unknown): Promise<void> {
  await ensureSchema();
  const query = getSql();
  const payload = JSON.stringify(data);
  const updatedAt = new Date().toISOString();
  await query`
    INSERT INTO app_state (key, data, updated_at)
    VALUES (${key}, ${payload}::jsonb, ${updatedAt})
    ON CONFLICT (key) DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = EXCLUDED.updated_at
  `;
}

export function userStateKey(kind: "progress" | "profile", userId: string): string {
  return `${kind}:${userId}`;
}
