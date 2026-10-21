/**
 * POST /api/paystack/webhook — set this URL in Paystack → Settings → API Keys & Webhooks:
 *   https://YOUR-DOMAIN/api/paystack/webhook
 * The signature (x-paystack-signature = HMAC-SHA512 of the raw body with the secret key) is checked,
 * duplicates are ignored, and the payment is then confirmed by calling Paystack's verify API.
 */
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { validWebhookSignature } from "@/lib/shop/paystack";
import { confirmPayment } from "@/lib/shop/orders";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 200_000) return new NextResponse("Too large", { status: 413 });
  if (!validWebhookSignature(raw, req.headers.get("x-paystack-signature"))) return new NextResponse("Invalid signature", { status: 401 });
  let evt: { event?: string; data?: { reference?: string } };
  try { evt = JSON.parse(raw); } catch { return new NextResponse("Bad JSON", { status: 400 }); }
  const id = createHash("sha256").update(raw).digest("hex");
  const db = await getDb();
  const ins = await db.query("INSERT INTO webhook_events (id, provider, event, reference) VALUES ($1,'paystack',$2,$3) ON CONFLICT (id) DO NOTHING", [id, String(evt.event ?? ""), evt.data?.reference ?? null]);
  if (!ins.rowCount) return NextResponse.json({ ok: true, duplicate: true });
  if (evt.event === "charge.success" && evt.data?.reference) {
    const out = await confirmPayment(String(evt.data.reference), "webhook");
    if (out.state === "error") {
      // Let Paystack retry later: forget this delivery and answer non-200.
      await db.query("DELETE FROM webhook_events WHERE id = $1", [id]);
      return new NextResponse("Verification temporarily unavailable", { status: 503 });
    }
  }
  return NextResponse.json({ ok: true });
}
