/**
 * Simple in-memory rate limiter. Good enough for a single server (e.g. one Railway instance).
 * It resets when the server restarts and is not shared between multiple instances.
 */
const buckets = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000) buckets.clear();
  return recent.length > max;
}

/**
 * Best-effort visitor IP. Hosting platforms put the real address in x-real-ip or append it as the
 * LAST entry of x-forwarded-for (earlier entries can be faked by the visitor, so they are ignored).
 */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const chain = headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return chain?.length ? chain[chain.length - 1] : "unknown";
}
