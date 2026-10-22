/**
 * GET /api/health — public, minimal, used by Railway's health check.
 * It really queries the database. It reveals nothing else: detailed diagnostics are on the admin Health page.
 */
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    await (await getDb()).query("SELECT 1");
    return Response.json({ ok: true }, { headers });
  } catch (e) {
    console.error("[health] database check failed:", (e as Error).name);
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
