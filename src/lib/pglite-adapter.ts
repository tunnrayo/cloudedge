/** Wraps a PGlite instance so it looks like the Db interface used by the whole app. */
import type { Db } from "./db-types.ts";

type Query = (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; affectedRows?: number }>;
type Exec = (sql: string) => Promise<unknown>;
interface PgLike { query: Query; exec: Exec; transaction<T>(fn: (t: { query: Query; exec: Exec }) => Promise<T>): Promise<T> }

export function wrapPglite(pg: PgLike): Db {
  // PGlite runs one statement per query(); multi-statement scripts (migrations) go through exec().
  const isScript = (sql: string, params: unknown[]) => !params.length && /;\s*\S/.test(sql.trim().replace(/;\s*$/, ""));
  const run = async (target: { query: Query; exec: Exec }, sql: string, params: unknown[] = []) => {
    if (isScript(sql, params)) { await target.exec(sql); return { rows: [] as never[], rowCount: 0 }; }
    const r = await target.query(sql, params);
    return { rows: r.rows as never[], rowCount: r.affectedRows ?? r.rows.length };
  };
  return {
    kind: "pglite",
    query: (sql, params = []) => run(pg, sql, params),
    tx: (fn) => pg.transaction((t) => fn((sql, params = []) => run(t, sql, params))),
  };
}
