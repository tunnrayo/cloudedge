/** Shared database types (no framework imports, so tests can use them). */
export type Row = Record<string, unknown>;
export interface Db {
  kind: "postgres" | "pglite";
  query<T = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
  /** Runs fn inside a transaction (BEGIN/COMMIT, ROLLBACK on error). */
  tx<T>(fn: (q: Db["query"]) => Promise<T>): Promise<T>;
}
