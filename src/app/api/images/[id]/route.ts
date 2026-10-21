/** GET /api/images/:id — product images uploaded in the admin (stored in the database so they survive redeploys). */
import { getDb } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const r = await (await getDb()).query<{ content_type: string; bytes: Buffer | Uint8Array }>("SELECT content_type, bytes FROM product_images WHERE id = $1", [id]);
  const img = r.rows[0];
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(img.bytes), {
    headers: { "Content-Type": img.content_type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" },
  });
}
