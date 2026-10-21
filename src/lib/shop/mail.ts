/**
 * CUSTOMER EMAILS (server-only), sent through Resend when RESEND_API_KEY and INQUIRY_FROM_EMAIL are set.
 * Every send returns "sent" | "failed" | "not_configured", and the result is recorded on the order's
 * history, so the website never claims an email was delivered when it wasn't.
 */
import "server-only";
import { company } from "@/lib/site";
import { nairaFromKobo } from "@/lib/shop/format";

export type EmailResult = "sent" | "failed" | "not_configured";
export const shopEmailConfigured = () => Boolean(process.env.RESEND_API_KEY && (process.env.SHOP_FROM_EMAIL || process.env.INQUIRY_FROM_EMAIL));

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").slice(0, 150);

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<EmailResult> {
  if (!shopEmailConfigured()) return "not_configured";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.SHOP_FROM_EMAIL || process.env.INQUIRY_FROM_EMAIL, to: [to], reply_to: company.email.toLowerCase(), subject: oneLine(subject), html, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) { console.error(`[mail] provider rejected (HTTP ${res.status})`); return "failed"; }
    return "sent";
  } catch (e) {
    console.error("[mail] send failed:", (e as Error).name);
    return "failed";
  }
}

type Item = { product_name: string; quantity: number; line_total_kobo: number | string; billing_label: string; option_label?: string; option_value?: string };
type OrderLike = { number: string; name: string; total_kobo: number | string; payment_mode?: string };

function layout(title: string, bodyHtml: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f3f7fd;padding:24px;color:#13213f">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #dde6f3">
    <div style="background:#061433;color:#fff;padding:18px 24px;font-weight:bold;font-size:18px">${esc(company.name)}</div>
    <div style="padding:24px"><h1 style="font-size:20px;color:#0a1f4d;margin:0 0 12px">${esc(title)}</h1>${bodyHtml}</div>
    <div style="padding:16px 24px;font-size:12px;color:#55657f;border-top:1px solid #dde6f3">${esc(company.name)} · RC ${company.rc} · ${esc(company.address.join(", "))} · ${esc(company.email)}</div>
  </div></div>`;
}
function itemsTable(items: Item[], total: number | string) {
  return `<table cellpadding="8" style="border-collapse:collapse;width:100%;font-size:14px;margin:12px 0">${items.map((i) =>
    `<tr style="border-bottom:1px solid #eef2f8"><td>${esc(i.product_name)}${i.option_value ? `<br><span style="color:#55657f">${esc(i.option_label || "Option")}: ${esc(i.option_value)}</span>` : ""}<br><span style="color:#55657f">${esc(i.billing_label)} × ${i.quantity}</span></td><td style="text-align:right;white-space:nowrap">${nairaFromKobo(i.line_total_kobo)}</td></tr>`).join("")}
    <tr><td style="font-weight:bold">Total</td><td style="text-align:right;font-weight:bold">${nairaFromKobo(total)}</td></tr></table>`;
}
const button = (href: string, label: string) => `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#0b66f5;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(label)}</a></p>`;
const testNote = (o: OrderLike) => (o.payment_mode === "test" ? `<p style="background:#fff6df;border:1px solid #f2d58c;padding:10px;border-radius:8px;font-size:13px">TEST MODE: this order was placed with Paystack test keys. No real money was charged.</p>` : "");

export function orderReceivedEmail(o: OrderLike, items: Item[], link: string) {
  const subject = `Order ${o.number} received — awaiting payment`;
  const html = layout("We've received your order", `<p>Hello ${esc(o.name)},</p><p>Thank you for your order <strong>${esc(o.number)}</strong>. It will be processed after your payment is confirmed by Paystack.</p>${itemsTable(items, o.total_kobo)}${button(link, "View or pay for your order")}${testNote(o)}`);
  return { subject, html, text: `Order ${o.number} received. Total ${nairaFromKobo(o.total_kobo)}. View: ${link}` };
}
export function paymentConfirmedEmail(o: OrderLike, items: Item[], link: string) {
  const subject = `Payment confirmed — order ${o.number}`;
  const html = layout("Payment confirmed", `<p>Hello ${esc(o.name)},</p><p>Your payment for order <strong>${esc(o.number)}</strong> has been verified with Paystack.</p>${itemsTable(items, o.total_kobo)}
  <p><strong>What happens next:</strong> our team sources or provisions your products from the vendor or a supplier and emails you activation instructions. If anything changes (for example the supplier price), we will ask for your approval or refund you.</p>${button(link, "Track your order")}${testNote(o)}`);
  return { subject, html, text: `Payment confirmed for order ${o.number}. Track: ${link}` };
}
export function statusUpdateEmail(o: OrderLike, statusLabel: string, message: string, link: string) {
  const subject = `Update on order ${o.number}: ${statusLabel}`;
  const html = layout(`Order update: ${statusLabel}`, `<p>Hello ${esc(o.name)},</p>${message ? `<p style="white-space:pre-wrap">${esc(message)}</p>` : ""}<p>Status: <strong>${esc(statusLabel)}</strong></p>${button(link, "View your order")}`);
  return { subject, html, text: `Order ${o.number}: ${statusLabel}. ${message}\n${link}` };
}
export function refundEmail(o: OrderLike, amountKobo: number, message: string, link: string) {
  const subject = `Refund for order ${o.number}`;
  const html = layout("Refund update", `<p>Hello ${esc(o.name)},</p><p>A refund of <strong>${nairaFromKobo(amountKobo)}</strong> has been recorded for order <strong>${esc(o.number)}</strong>.</p>${message ? `<p style="white-space:pre-wrap">${esc(message)}</p>` : ""}<p>Card refunds usually take several business days to appear, depending on your bank.</p>${button(link, "View your order")}`);
  return { subject, html, text: `Refund of ${nairaFromKobo(amountKobo)} recorded for order ${o.number}. ${link}` };
}
export function staffNewOrderEmail(o: OrderLike & { email: string }, items: Item[]) {
  const subject = `[Shop] Paid order ${o.number} — sourcing required`;
  const html = layout(`New paid order ${o.number}`, `<p>Customer: ${esc(o.name)} (${esc(o.email)})</p>${itemsTable(items, o.total_kobo)}<p>Open Admin → Orders to source and fulfil it.</p>${testNote(o)}`);
  return { subject, html, text: `Paid order ${o.number} from ${o.name} (${o.email}). Total ${nairaFromKobo(o.total_kobo)}.` };
}
