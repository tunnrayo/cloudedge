/**
 * POST /api/inquiry — receives the Contact and Request-a-Quote forms.
 * Steps: rate limit -> parse -> honeypot -> validate -> save (if storage configured) -> email (if configured).
 * The visitor is only told "received" if the inquiry was actually saved or emailed.
 */
import { NextResponse } from "next/server";
import { normalize, validate } from "@/lib/validate";
import { company } from "@/lib/site";
import { getStore } from "@/lib/inquiries";
import { emailConfigured, sendInquiryEmail } from "@/lib/email";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { getProduct } from "@/lib/shop/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (status: number, error: string, extra: object = {}) => NextResponse.json({ ok: false, error, ...extra }, { status });
const fallback = `Please email us directly at ${company.email}.`;

export async function POST(req: Request) {
  // Block cross-site form posts from other websites.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host) {
    let originHost = "";
    try { originHost = new URL(origin).host; } catch { /* malformed origin */ }
    if (originHost !== host) return fail(403, "Request blocked.");
  }

  if (rateLimited(`inq:${clientIp(req.headers)}`, 5, 10 * 60_000)) return fail(429, "Too many messages sent in a short time. Please wait a few minutes and try again.");
  if (Number(req.headers.get("content-length") ?? 0) > 20_000) return fail(413, "Your message is too long.");

  let body: unknown;
  try { body = await req.json(); } catch { return fail(400, "Invalid request."); }

  const input = normalize(body);
  if (input.website) return NextResponse.json({ ok: true }); // honeypot filled: quietly ignore bots

  const errors = validate(input);
  if (input.product && !(await getProduct(input.product).catch(() => null))) errors.product = "Unknown product.";
  if (Object.keys(errors).length) return fail(422, "Please correct the highlighted fields.", { errors });

  const store = getStore();
  if (!store && !emailConfigured()) {
    console.error("[inquiry] no storage and no email configured — inquiry NOT received");
    return fail(503, `Online messages are not set up on this website yet, so your message was NOT sent. ${fallback}`);
  }

  // 1) Save
  let saved: Awaited<ReturnType<NonNullable<typeof store>["create"]>> | null = null;
  if (store) {
    try {
      const { website: _honeypot, ...data } = input;
      void _honeypot;
      saved = await store.create(data);
    } catch (e) {
      console.error("[inquiry] storage failed:", (e as Error).message);
    }
  }

  // 2) Notify by email
  const emailResult = await sendInquiryEmail(input, saved?.reference);
  if (saved && emailResult !== "not_configured") {
    await store!.setEmailStatus(saved.id, emailResult).catch(() => {});
  }

  if (saved) return NextResponse.json({ ok: true, reference: saved.reference });
  if (emailResult === "sent") return NextResponse.json({ ok: true });
  return fail(502, `We could not deliver your message right now, so it was NOT sent. ${fallback}`);
}

export function GET() {
  return fail(405, "Method not allowed.");
}
