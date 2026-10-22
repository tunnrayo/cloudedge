/**
 * Small guards for public JSON endpoints (no framework imports, so they are unit-tested directly).
 */

/** Rejects cross-site POST requests. Browsers always send Origin (and Sec-Fetch-Site) on cross-site POSTs. */
export function sameOrigin(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}

export type JsonResult = { ok: true; body: unknown } | { ok: false; status: 400 | 413 | 415; error: string };

/**
 * Reads a JSON body safely: the Content-Type must be application/json (415), the body is read in chunks and
 * stopped as soon as it passes maxBytes (413) even when no Content-Length was sent, and bad JSON is a 400.
 */
export async function readJson(req: Request, maxBytes: number): Promise<JsonResult> {
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") return { ok: false, status: 415, error: "Unsupported content type." };
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) return { ok: false, status: 413, error: "The request is too large." };
  if (!req.body) return { ok: false, status: 400, error: "Invalid request." };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel().catch(() => {}); return { ok: false, status: 413, error: "The request is too large." }; }
    chunks.push(value);
  }
  try { return { ok: true, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) }; }
  catch { return { ok: false, status: 400, error: "Invalid request." }; }
}
