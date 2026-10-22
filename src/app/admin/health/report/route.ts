/** GET /admin/health/report — the same checks as the Health page, as JSON. Admin only. 503 when a critical check fails. */
import { isAdmin } from "@/lib/admin-session";
import { runHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return Response.json({ ok: false, error: "Not signed in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const report = await runHealth();
  return Response.json({ ok: report.status !== "FAIL", ...report }, { status: report.status === "FAIL" ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
