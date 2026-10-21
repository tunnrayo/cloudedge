/**
 * EMAIL NOTIFICATIONS (server-only) via Resend's HTTP API — no extra package needed.
 * Configure RESEND_API_KEY and INQUIRY_FROM_EMAIL (see .env.example). INQUIRY_TO_EMAIL is optional.
 */
import "server-only";
import { company } from "@/lib/site";
import type { InquiryInput } from "@/lib/validate";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.INQUIRY_FROM_EMAIL);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
// Remove line breaks so user input can never inject extra email headers.
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").slice(0, 120);

export async function sendInquiryEmail(i: InquiryInput, reference?: string): Promise<"sent" | "failed" | "not_configured"> {
  if (!emailConfigured()) return "not_configured";
  const to = process.env.INQUIRY_TO_EMAIL || company.email;
  const rows: [string, string][] = [
    ["Reference", reference ?? "-"], ["Form", i.mode === "quote" ? "Request a quote" : "Contact"], ["Name", i.name], ["Email", i.email],
    ["Phone", i.phone || "-"], ["Organisation", i.organization || "-"], ["Inquiry type", i.type], ["Product", i.product || "-"],
    ["Timeline", i.timeline || "-"], ["Budget", i.budget || "-"], ["Project description", i.scope || "-"], ["Message", i.message || "-"],
  ];
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#13213f">
    <h2 style="color:#0a1f4d">New website inquiry</h2>
    <table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="vertical-align:top;font-weight:bold;white-space:nowrap">${k}</td><td>${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("")}</table>
    <p style="color:#55657f">Reply directly to this email to respond to ${esc(i.name)}.</p></div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.INQUIRY_FROM_EMAIL, to: [to], reply_to: i.email, subject: oneLine(`[Website] ${i.type} from ${i.name}${reference ? ` (${reference})` : ""}`), html, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) { console.error(`[email] provider rejected the request (HTTP ${res.status})`); return "failed"; }
    return "sent";
  } catch (e) {
    console.error("[email] request failed:", (e as Error).name);
    return "failed";
  }
}
