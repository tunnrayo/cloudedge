import { NextResponse } from "next/server";
import { normalize, validate } from "@/lib/validate";
import { company } from "@/lib/site";

export const runtime = "nodejs";

// Simple per-instance rate limit (5 requests / 10 min / IP). Resets on restart; see ARCHITECTURE.md.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now(), window = 10 * 60 * 1000;
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < window);
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return NextResponse.json({ ok: false, error: "Too many requests. Please try again in a few minutes." }, { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 }); }
  const input = normalize(body);
  if (input.website) return NextResponse.json({ ok: true }); // honeypot: silently drop bots
  const errors = validate(input);
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, error: "Please correct the highlighted fields.", errors }, { status: 422 });

  const key = process.env.RESEND_API_KEY, from = process.env.INQUIRY_FROM_EMAIL;
  if (!key || !from) {
    return NextResponse.json({ ok: false, error: `Online sending is not configured yet, so your message was NOT sent. Please email ${company.email} directly.` }, { status: 503 });
  }
  const to = process.env.INQUIRY_TO_EMAIL || company.email;
  const rows: [string, string][] = [["Type", input.mode === "quote" ? "Project inquiry" : "Contact"], ["Name", input.name], ["Email", input.email], ["Organization", input.organization || "-"], ["Inquiry", input.type], ["Budget", input.budget || "-"], ["Scope", input.scope || "-"], ["Message", input.message]];
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: input.email, subject: `[Website] ${input.type} from ${input.name}`,
        html: rows.map(([k, v]) => `<p><strong>${k}:</strong><br>${esc(v).replace(/\n/g, "<br>")}</p>`).join("") }),
    });
    if (!res.ok) { console.error("Email provider rejected request, status", res.status); throw new Error("provider"); }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: `We could not send your message right now. Please email ${company.email} directly.` }, { status: 502 });
  }
}
