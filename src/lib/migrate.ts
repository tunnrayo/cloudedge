/** Applies pending migrations (each exactly once, recorded in schema_migrations). Never drops or rewrites data. */
import type { Db } from "./db-types.ts";
import { MIGRATIONS } from "./migrations.ts";

export async function applyMigrations(db: Db, log: (m: string) => void = () => {}): Promise<number[]> {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id INT PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const applied: number[] = [];
  await db.tx(async (q) => {
    // Advisory lock stops two app instances from migrating at the same time (Postgres only).
    if (db.kind === "postgres") await q("SELECT pg_advisory_xact_lock(724519)");
    const done = new Set((await q<{ id: number }>("SELECT id FROM schema_migrations")).rows.map((r) => Number(r.id)));
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      await q(m.sql);
      await q("INSERT INTO schema_migrations (id, name) VALUES ($1, $2)", [m.id, m.name]);
      applied.push(m.id);
      log(`[db] applied migration ${m.id} ${m.name}`);
    }
  });
  return applied;
}
