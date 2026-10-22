/**
 * EMAIL NOTIFICATIONS (server-only) via Resend's HTTP API — no extra package needed.
 * Configure RESEND_API_KEY and INQUIRY_FROM_EMAIL (see .env.example). INQUIRY_TO_EMAIL is optional.
 */
import "server-only";
import { company } from "@/lib/site";
import type { InquiryInput } from "@/lib/validate";
import { sendViaResend } from "@/lib/email-core";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.INQUIRY_FROM_EMAIL);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

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
  return sendViaResend(
    { from: process.env.INQUIRY_FROM_EMAIL || "", to, replyTo: i.email, subject: `[Website] ${i.type} from ${i.name}${reference ? ` (${reference})` : ""}`, html, text },
    { apiKey: process.env.RESEND_API_KEY || "", baseUrl: process.env.RESEND_BASE_URL },
  );
}
