// Creates the inquiries table in the database given by DATABASE_URL.
// Usage (Mac/Linux):   DATABASE_URL="postgres://..." npm run db:setup
// Usage (Windows PowerShell):  $env:DATABASE_URL="postgres://..."; npm run db:setup
// The website also creates the table automatically, so this is optional.
import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set. See .env.example."); process.exit(1); }
const sql = await readFile(new URL("../docs/database/schema.sql", import.meta.url), "utf8");
const ssl = process.env.DATABASE_SSL === "true" || /sslmode=require/.test(url) ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined;
const client = new pg.Client({ connectionString: url, ssl });
try {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query("SELECT COUNT(*)::int AS n FROM inquiries");
  console.log(`Success: the database schema is ready (${rows[0].n} inquiries stored).`);
} catch (e) {
  console.error("Database setup failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
