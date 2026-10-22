/**
 * EMAIL SENDING CORE (no framework imports, so it is unit-tested with a fake HTTP function)
 *
 * - Addresses must be a single plain address; anything with line breaks, commas or angle brackets is refused,
 *   which closes email-header-injection.
 * - One retry for temporary problems (network error, timeout, HTTP 429 or 5xx). Both attempts share one
 *   Idempotency-Key, so the provider can never deliver the same message twice.
 * - Returns only "sent" or "failed". "sent" means the provider ACCEPTED the message (HTTP 2xx); delivery to the
 *   inbox is not something Resend confirms to us at this point, so callers must word things accordingly.
 * - The API key, the message and the provider's reply are never logged.
 */
import { randomUUID } from "node:crypto";

export type SendResult = "sent" | "failed";
export type HttpFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ status: number; ok: boolean }>;

const ADDRESS = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const FROM = /^(?:[^<>\r\n,;"]{1,80}\s)?<?[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+>?$/;
export const safeAddress = (s: unknown): s is string => typeof s === "string" && s.length <= 254 && ADDRESS.test(s);
export const safeFrom = (s: unknown): s is string => typeof s === "string" && s.length <= 200 && FROM.test(s.trim());
export const oneLine = (s: string, max = 150) => s.replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, " ").trim().slice(0, max);
export const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type Message = { from: string; to: string; replyTo?: string; subject: string; html: string; text: string };

export async function sendViaResend(
  msg: Message,
  o: { apiKey: string; baseUrl?: string; fetcher?: HttpFetch; retryDelayMs?: number; log?: (m: string) => void },
): Promise<SendResult> {
  const log = o.log ?? ((m: string) => console.error(m));
  if (!o.apiKey) return "failed";
  if (!safeAddress(msg.to) || !safeFrom(msg.from) || (msg.replyTo !== undefined && !safeAddress(msg.replyTo))) { log("[mail] refused: unsafe address"); return "failed"; }
  const fetcher = o.fetcher ?? (fetch as unknown as HttpFetch);
  const url = `${(o.baseUrl || "https://api.resend.com").replace(/\/$/, "")}/emails`;
  const body = JSON.stringify({ from: msg.from, to: [msg.to], ...(msg.replyTo ? { reply_to: msg.replyTo } : {}), subject: oneLine(msg.subject), html: msg.html, text: msg.text });
  const key = randomUUID();
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetcher(url, { method: "POST", headers: { Authorization: `Bearer ${o.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key }, body, signal: AbortSignal.timeout(10_000) });
      if (res.ok) return "sent";
      const temporary = res.status === 429 || res.status >= 500;
      log(`[mail] provider answered HTTP ${res.status}${temporary && attempt === 1 ? " — retrying once" : ""}`);
      if (!temporary) return "failed";
    } catch (e) {
      log(`[mail] could not reach the provider (${(e as Error).name})${attempt === 1 ? " — retrying once" : ""}`);
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, o.retryDelayMs ?? 800));
  }
  return "failed";
}
