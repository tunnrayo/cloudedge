/**
 * Inquiry validation shared by the browser (instant feedback) and the server (the real check).
 * The server never trusts the browser: it runs these same rules again.
 */
import { inquiryTypes, budgetRanges, timelines } from "./site.ts";

export type InquiryInput = {
  mode: "contact" | "quote";
  name: string;
  email: string;
  phone: string;
  organization: string;
  type: string;
  budget: string;
  timeline: string;
  scope: string;
  message: string;
  product: string;
  /** Honeypot: hidden from people, bots tend to fill it in. */
  website: string;
};
export type FieldErrors = Partial<Record<keyof InquiryInput, string>>;

export const LIMITS = { name: 100, email: 200, phone: 30, organization: 150, type: 80, budget: 60, timeline: 60, scope: 3000, message: 4000, product: 80, website: 100 } as const;

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const PHONE = /^\+?[0-9][0-9\s()-]{6,24}$/;
const SLUG = /^[a-z0-9-]*$/;
// Strip control characters except newlines/tabs, trim, and cap length.
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max) : "";

export function normalize(raw: unknown): InquiryInput {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = {} as InquiryInput;
  (Object.keys(LIMITS) as (keyof typeof LIMITS)[]).forEach((k) => { (out as Record<string, string>)[k] = clean(r[k], LIMITS[k]); });
  out.mode = r.mode === "quote" ? "quote" : "contact";
  out.email = out.email.toLowerCase();
  return out;
}

export function validate(i: InquiryInput): FieldErrors {
  const e: FieldErrors = {};
  if (i.name.length < 2) e.name = "Please enter your name.";
  if (!EMAIL.test(i.email)) e.email = "Please enter a valid email address, for example name@company.com.";
  if (i.phone && !PHONE.test(i.phone)) e.phone = "Please enter a valid phone number, or leave it blank.";
  if (!inquiryTypes.includes(i.type)) e.type = "Please choose what your inquiry is about.";
  if (i.budget && !budgetRanges.includes(i.budget)) e.budget = "Please choose one of the listed budget ranges.";
  if (i.timeline && !timelines.includes(i.timeline)) e.timeline = "Please choose one of the listed timelines.";
  if (i.product && !SLUG.test(i.product)) e.product = "Unknown product.";
  if (i.mode === "quote") {
    if (i.scope.length < 20) e.scope = "Please describe your project in at least 20 characters.";
    if (i.message && i.message.length < 2) e.message = "Please add a little more detail, or leave this blank.";
  } else if (i.message.length < 10) {
    e.message = "Please write a message of at least 10 characters.";
  }
  return e;
}
