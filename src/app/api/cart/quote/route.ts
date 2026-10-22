/** POST /api/cart/quote — indicative prices and request availability for the items in a request list. */
import { NextResponse } from "next/server";
import { quoteCart } from "@/lib/shop/orders";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { items?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 }); }
  const items = Array.isArray(body.items) ? body.items.slice(0, 50).map((x) => ({ slug: String((x as { slug?: unknown }).slug ?? ""), quantity: Number((x as { quantity?: unknown }).quantity ?? 1), option: String((x as { option?: unknown }).option ?? "") })) : [];
  try {
    return NextResponse.json({ ok: true, ...(await quoteCart(items)) });
  } catch (e) {
    console.error("[cart] quote failed:", (e as Error).message);
    return NextResponse.json({ ok: false, error: "Could not load current prices. Please try again." }, { status: 503 });
  }
}
