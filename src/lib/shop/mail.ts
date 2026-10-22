/**
 * CUSTOMER EMAILS (server-only), sent through Resend when RESEND_API_KEY and INQUIRY_FROM_EMAIL are set.
 * Every send returns "sent" | "failed" | "not_configured", and the result is recorded on the order's
 * history, so the website never claims an email was delivered when it wasn't.
 */
import "server-only";
import { company } from "@/lib/site";
import { nairaFromKobo } from "@/lib/shop/format";
import { sendViaResend } from "@/lib/email-core";

export type EmailResult = "sent" | "failed" | "not_configured";
export const shopEmailConfigured = () => Boolean(process.env.RESEND_API_KEY && (process.env.SHOP_FROM_EMAIL || process.env.INQUIRY_FROM_EMAIL));

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<EmailResult> {
  if (!shopEmailConfigured()) return "not_configured";
  return sendViaResend(
    { from: process.env.SHOP_FROM_EMAIL || process.env.INQUIRY_FROM_EMAIL || "", to, replyTo: company.email.toLowerCase(), subject, html, text },
    { apiKey: process.env.RESEND_API_KEY || "", baseUrl: process.env.RESEND_BASE_URL },
  );
}

type Item = { product_name: string; quantity: number; billing_label: string; option_label?: string; option_value?: string; line_total_kobo?: number | string };
type OrderLike = { number: string; name: string; payment_mode?: string };
export type QuoteLineView = { product_name: string; quantity: number; price_kobo: number | string };
export type QuoteView = { version: number; total_kobo: number | string; expires_at: string | Date | null; delivery_estimate: string; licence_terms: string; customer_note: string; lines: QuoteLineView[] };

function layout(title: string, bodyHtml: string, kind: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f3f7fd;padding:24px;color:#13213f">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #dde6f3">
    <div style="background:#061433;color:#fff;padding:18px 24px;font-weight:bold;font-size:18px">${esc(company.name)}<div style="font-size:12px;font-weight:normal;color:#9fb6e0;margin-top:4px;text-transform:uppercase;letter-spacing:1px">${esc(kind)}</div></div>
    <div style="padding:24px"><h1 style="font-size:20px;color:#0a1f4d;margin:0 0 12px">${esc(title)}</h1>${bodyHtml}</div>
    <div style="padding:16px 24px;font-size:12px;color:#55657f;border-top:1px solid #dde6f3">${esc(company.name)} · RC ${company.rc} · ${esc(company.address.join(", "))} · ${esc(company.email)}<br>Cloud Edge sources eligible software products through external suppliers and is not an authorised partner of the software vendors unless stated in writing.</div>
  </div></div>`;
}
const p = (t: string) => `<p style="white-space:pre-wrap">${esc(t)}</p>`;
const button = (href: string, label: string) => `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#0b66f5;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(label)}</a></p>`;
const testNote = (o: OrderLike) => (o.payment_mode === "test" ? `<p style="background:#fff6df;border:1px solid #f2d58c;padding:10px;border-radius:8px;font-size:13px">TEST MODE: no real money is involved.</p>` : "");
function requestTable(items: Item[]) {
  return `<table cellpadding="8" style="border-collapse:collapse;width:100%;font-size:14px;margin:12px 0">${items.map((i) =>
    `<tr style="border-bottom:1px solid #eef2f8"><td>${esc(i.product_name)}${i.option_value ? `<br><span style="color:#55657f">${esc(i.option_label || "Option")}: ${esc(i.option_value)}</span>` : ""}<br><span style="color:#55657f">${esc(i.billing_label)} × ${i.quantity}</span></td></tr>`).join("")}</table>`;
}
function quoteTable(q: QuoteView) {
  return `<table cellpadding="8" style="border-collapse:collapse;width:100%;font-size:14px;margin:12px 0">${q.lines.map((l) =>
    `<tr style="border-bottom:1px solid #eef2f8"><td>${esc(l.product_name)} × ${l.quantity}</td><td style="text-align:right;white-space:nowrap">${nairaFromKobo(l.price_kobo)}</td></tr>`).join("")}
    <tr><td style="font-weight:bold">Total</td><td style="text-align:right;font-weight:bold">${nairaFromKobo(q.total_kobo)}</td></tr></table>`;
}
const t = (subject: string, html: string, text: string) => ({ subject, html, text });

export const mails = {
  requestReceived: (o: OrderLike, items: Item[], link: string) => t(`Request ${o.number} received — not yet an order`, layout("We've received your request", `<p>Hello ${esc(o.name)},</p>
    <p>Thank you. Your request reference is <strong>${esc(o.number)}</strong>.</p>${requestTable(items)}
    <p><strong>This is an acknowledgement only — not an order confirmation.</strong> Nothing has been secured and you have not been charged.
    Cloud Edge sources eligible software products through external suppliers. We will check availability, licence eligibility, the final price and the delivery time, then send you a quotation to accept or decline.</p>${button(link, "View your request")}`, "Request acknowledgement"),
    `Request ${o.number} received. This is not an order confirmation; we will send a quotation. ${link}`),
  quoteReady: (o: OrderLike, q: QuoteView, link: string, revised: boolean) => t(`${revised ? "Revised quotation" : "Your quotation"} for ${o.number} — approval needed`, layout(revised ? "Your revised quotation is ready" : "Your quotation is ready", `<p>Hello ${esc(o.name)},</p>
    <p>We have checked supply for request <strong>${esc(o.number)}</strong>. ${revised ? "This replaces the previous quotation, which is no longer valid." : ""}</p>${quoteTable(q)}
    ${q.delivery_estimate ? `<p><strong>Delivery estimate:</strong> ${esc(q.delivery_estimate)}</p>` : ""}${q.licence_terms ? `<p><strong>Licence / subscription:</strong> ${esc(q.licence_terms)}</p>` : ""}${q.customer_note ? p(q.customer_note) : ""}
    <p><strong>Your approval is required.</strong> ${q.expires_at ? `This quotation is valid until ${esc(new Date(q.expires_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }))}.` : ""} You will only be asked to pay after you accept.</p>${button(link, "Review and accept or decline")}`, "Quotation — action required"),
    `Quotation for ${o.number}: ${nairaFromKobo(q.total_kobo)}. Review and accept or decline: ${link}`),
  quoteAccepted: (o: OrderLike, q: QuoteView, link: string, payOnline: boolean) => t(`Order confirmed — ${o.number} awaiting payment`, layout("Quotation accepted — order confirmed", `<p>Hello ${esc(o.name)},</p>
    <p>You accepted quotation v${q.version} for <strong>${esc(o.number)}</strong>. Your order is now confirmed at this price.</p>${quoteTable(q)}
    <p><strong>Next step — payment:</strong> ${payOnline ? "pay securely online with Paystack from your order page." : "we will send you payment instructions."} We place the supplier order only after your payment is confirmed.</p>${button(link, payOnline ? "Pay for your order" : "View your order")}${testNote(o)}`, "Order confirmation"),
    `Order ${o.number} confirmed at ${nairaFromKobo(q.total_kobo)}. Payment next: ${link}`),
  paymentInstructions: (o: OrderLike, total: number | string, instructions: string, link: string) => t(`Payment instructions for ${o.number}`, layout("Payment instructions", `<p>Hello ${esc(o.name)},</p>
    <p>Amount due for order <strong>${esc(o.number)}</strong>: <strong>${nairaFromKobo(total)}</strong>.</p>${p(instructions)}
    <p>Please quote <strong>${esc(o.number)}</strong> as your payment reference. We will confirm by email once your payment has been verified.</p>${button(link, "View your order")}`, "Payment instructions"),
    `Pay ${nairaFromKobo(total)} for ${o.number}. ${instructions} ${link}`),
  paymentConfirmed: (o: OrderLike, total: number | string, how: string, link: string) => t(`Payment confirmed — ${o.number}`, layout("Payment confirmed", `<p>Hello ${esc(o.name)},</p>
    <p>We have verified your payment of <strong>${nairaFromKobo(total)}</strong> for order <strong>${esc(o.number)}</strong> (${esc(how)}).</p>
    <p>We will now place the order with our supplier and keep you updated. Delivery timing depends on the supplier and is confirmed as we go.</p>${button(link, "Track your order")}${testNote(o)}`, "Payment confirmation"),
    `Payment of ${nairaFromKobo(total)} confirmed for ${o.number}. ${link}`),
  sourcingUpdate: (o: OrderLike, statusLabel: string, message: string, link: string) => t(`Update on ${o.number}: ${statusLabel}`, layout(`Update: ${statusLabel}`, `<p>Hello ${esc(o.name)},</p>${message ? p(message) : ""}<p>Current status: <strong>${esc(statusLabel)}</strong></p>${button(link, "View your request")}`, "Sourcing update"),
    `${o.number}: ${statusLabel}. ${message} ${link}`),
  unavailable: (o: OrderLike, message: string, link: string, paid: boolean) => t(`We could not source request ${o.number}`, layout("Product unavailable", `<p>Hello ${esc(o.name)},</p>
    <p>We are sorry — we could not find a legitimate supply option for request <strong>${esc(o.number)}</strong>.</p>${message ? p(message) : ""}
    <p>${paid ? "Because you have paid, we will refund you; you will receive a refund update." : "You have not been charged."}</p>${button(link, "View your request")}`, "Unavailable"),
    `Request ${o.number} could not be sourced. ${message} ${link}`),
  cancelled: (o: OrderLike, message: string, link: string, paid: boolean) => t(`Request ${o.number} cancelled`, layout("Request cancelled", `<p>Hello ${esc(o.name)},</p><p>Request <strong>${esc(o.number)}</strong> has been cancelled.</p>${message ? p(message) : ""}<p>${paid ? "A refund update will follow." : "You have not been charged."}</p>${button(link, "View your request")}`, "Cancellation"),
    `Request ${o.number} cancelled. ${message} ${link}`),
  refund: (o: OrderLike, amountKobo: number, status: string, message: string, link: string) => t(`Refund update for ${o.number}`, layout("Refund update", `<p>Hello ${esc(o.name)},</p>
    <p>Refund of <strong>${nairaFromKobo(amountKobo)}</strong> for order <strong>${esc(o.number)}</strong>: <strong>${esc(status)}</strong>.</p>${message ? p(message) : ""}<p>Card refunds usually take several business days to appear, depending on your bank.</p>${button(link, "View your order")}`, "Refund update"),
    `Refund ${nairaFromKobo(amountKobo)} for ${o.number}: ${status}. ${link}`),
  fulfilled: (o: OrderLike, message: string, link: string) => t(`Order ${o.number} fulfilled`, layout("Your order is complete", `<p>Hello ${esc(o.name)},</p><p>Order <strong>${esc(o.number)}</strong> has been fulfilled. Your delivery details and instructions are on your order page.</p>${message ? p(message) : ""}${button(link, "View delivery details")}`, "Fulfilment completed"),
    `Order ${o.number} fulfilled. Details: ${link}`),
  staff: (subject: string, lines: string[]) => t(`[Cloud Edge] ${subject}`, layout(subject, lines.map((l) => `<p>${esc(l)}</p>`).join(""), "Staff notification"), `${subject}\n${lines.join("\n")}`),
};
