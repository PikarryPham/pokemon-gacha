import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

export type DB = PgDatabase<PgQueryResultHKT>;

export interface DbHandle {
  db: DB;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

const MIGRATIONS = path.join(process.cwd(), "drizzle");

/** Postgres thật (Neon/Supabase) khi deploy. Dùng connection string dạng pooled. */
async function openPostgres(url: string): Promise<DbHandle> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(url, { prepare: false, max: 5 });
  const db = drizzle(client);
  return {
    db: db as unknown as DB,
    migrate: () => migrate(db, { migrationsFolder: MIGRATIONS }),
    close: () => client.end(),
  };
}

/** Postgres nhúng (PGlite) cho dev/test: không cần cài hay đăng ký gì. `dataDir` bỏ trống = in-memory. */
export async function openPglite(dataDir?: string): Promise<DbHandle> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dataDir) (await import("node:fs")).mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client);
  return {
    db: db as unknown as DB,
    migrate: () => migrate(db, { migrationsFolder: MIGRATIONS }),
    close: () => client.close(),
  };
}

export function openDefaultDb(): Promise<DbHandle> {
  const url = process.env.DATABASE_URL;
  if (url) return openPostgres(url);
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PGLITE) {
    throw new Error("DATABASE_URL chưa được cấu hình");
  }
  return openPglite(process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite"));
}

// Giữ một kết nối duy nhất cho mỗi process (kể cả khi dev server hot-reload).
const globalForDb = globalThis as unknown as { __dbHandle?: Promise<DbHandle> };

export async function getDb(): Promise<DB> {
  globalForDb.__dbHandle ??= openDefaultDb();
  return (await globalForDb.__dbHandle).db;
}
