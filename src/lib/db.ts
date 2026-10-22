/**
 * DATABASE CONNECTION (server-only)
 *
 * - DATABASE_URL set (Railway / production): real PostgreSQL via the "pg" pool.
 * - No DATABASE_URL on your own computer: PGlite, a full PostgreSQL engine that stores its
 *   data in the folder .data/pglite (no installation needed). Same SQL, same behaviour.
 * - In production without DATABASE_URL the shop refuses to start orders (data would be lost).
 *
 * Migrations (src/lib/migrations.ts) run automatically, once, the first time the database is used.
 */
import "server-only";
import { localDbDir, prepareLocalDbDir } from "@/lib/local-db-path";
import { applyMigrations } from "@/lib/migrate";
import { wrapPglite } from "@/lib/pglite-adapter";
import { seedCatalogueIfNeeded } from "@/lib/shop/seed";
import { seedServicesIfNeeded } from "@/lib/services-core";

export type { Row, Db } from "@/lib/db-types";
import type { Db } from "@/lib/db-types";

export class DbUnavailableError extends Error {
  constructor(msg = "The database is not configured. Set DATABASE_URL.") { super(msg); this.name = "DbUnavailableError"; }
}

const g = globalThis as unknown as { __ceDb?: Promise<Db> };

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL) || process.env.NODE_ENV !== "production" || process.env.ALLOW_PGLITE_IN_PRODUCTION === "true";
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool, types } = await import("pg");
    // Return DATE columns as plain "YYYY-MM-DD" strings (avoids time-zone shifts).
    types.setTypeParser(1082, (v: string) => v);
    const ssl = process.env.DATABASE_SSL === "true" || /sslmode=require/.test(url) ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined;
    const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 10), ssl, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 });
    pool.on("error", (e) => console.error("[db] idle client error:", e.message));
    const query: Db["query"] = async (sql, params = []) => {
      const r = await pool.query(sql, params as unknown[]);
      return { rows: r.rows, rowCount: r.rowCount ?? 0 };
    };
    return {
      kind: "postgres", query,
      async tx(fn) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const out = await fn(async (sql, params = []) => { const r = await client.query(sql, params as unknown[]); return { rows: r.rows, rowCount: r.rowCount ?? 0 }; });
          await client.query("COMMIT");
          return out;
        } catch (e) { await client.query("ROLLBACK").catch(() => {}); throw e; } finally { client.release(); }
      },
    };
  }
  if (!databaseConfigured()) throw new DbUnavailableError();
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = localDbDir();
  prepareLocalDbDir(dir); // creates ".data" and ".data/pglite" if missing (fixes ENOENT mkdir on a clean checkout)
  if (process.env.NODE_ENV === "production") console.warn("[db] WARNING: using the local PGlite database in production. Data is lost when the host is redeployed. Set DATABASE_URL.");
  const pg = await PGlite.create(dir);
  return wrapPglite(pg as unknown as Parameters<typeof wrapPglite>[0]);
}

async function migrate(db: Db) {
  await applyMigrations(db, console.log);
  await seedCatalogueIfNeeded(db);
  await seedServicesIfNeeded(db); // one-time copy of the built-in services; never overwrites admin edits
}

/** Shared database handle. Connects, migrates and seeds on first use. */
export function getDb(): Promise<Db> {
  g.__ceDb ??= (async () => { const db = await connect(); await migrate(db); return db; })().catch((e) => { g.__ceDb = undefined; throw e; });
  return g.__ceDb;
}
