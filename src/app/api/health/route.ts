/** GET /api/health — used by Railway's health check. Reports whether the database answers. */
import { getDb } from "@/lib/db";
import { paystackMode } from "@/lib/shop/paystack";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    await db.query("SELECT 1");
    return Response.json({ ok: true, database: db.kind, payments: paystackMode() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[health] database check failed:", (e as Error).message);
    return Response.json({ ok: false, database: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
