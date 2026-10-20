import { inquiryTypes, budgetRanges } from "./site.ts";

export type InquiryInput = {
  name: string; email: string; organization: string; type: string; budget: string;
  scope: string; message: string; website: string; mode: "contact" | "quote";
};
export type FieldErrors = Partial<Record<keyof InquiryInput, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function normalize(raw: unknown): InquiryInput {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    name: clean(r.name, 100), email: clean(r.email, 200), organization: clean(r.organization, 150),
    type: clean(r.type, 80), budget: clean(r.budget, 60), scope: clean(r.scope, 1500),
    message: clean(r.message, 3000), website: clean(r.website, 100), mode: r.mode === "quote" ? "quote" : "contact",
  };
}

export function validate(i: InquiryInput): FieldErrors {
  const e: FieldErrors = {};
  if (i.name.length < 2) e.name = "Please enter your name.";
  if (!EMAIL.test(i.email)) e.email = "Please enter a valid email address.";
  if (!inquiryTypes.includes(i.type)) e.type = "Please choose an inquiry type.";
  if (i.budget && !budgetRanges.includes(i.budget)) e.budget = "Please choose a listed option.";
  if (i.message.length < 10) e.message = "Please write at least 10 characters.";
  if (i.mode === "quote" && i.scope.length < 10) e.scope = "Please briefly describe the project scope.";
  return e;
}
