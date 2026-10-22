/** POST /api/cart/quote — indicative prices and request availability for the items in a request list. */
import { NextResponse } from "next/server";
import { quoteCart } from "@/lib/shop/orders";
import { readJson, sameOrigin } from "@/lib/request-guard";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: "Request blocked." }, { status: 403 });
  if (rateLimited(`cartquote:${clientIp(req.headers)}`, 120, 10 * 60_000)) return NextResponse.json({ ok: false, error: "Too many requests. Please wait a few minutes." }, { status: 429 });
  const parsed = await readJson(req, 20_000);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  const body = (parsed.body && typeof parsed.body === "object" ? parsed.body : {}) as { items?: unknown };
  const items = Array.isArray(body.items)
    ? body.items.slice(0, 50).map((raw) => {
        const x = (raw && typeof raw === "object" ? raw : {}) as { slug?: unknown; quantity?: unknown; option?: unknown };
        return { slug: typeof x.slug === "string" ? x.slug : "", quantity: Number(x.quantity ?? 1), option: typeof x.option === "string" ? x.option : "" };
      })
    : [];
  try {
    return NextResponse.json({ ok: true, ...(await quoteCart(items)) });
  } catch (e) {
    console.error("[cart] quote failed:", (e as Error).message);
    return NextResponse.json({ ok: false, error: "Could not load current prices. Please try again." }, { status: 503 });
  }
}
