"use client";
import { useState } from "react";
import { inquiryTypes, budgetRanges } from "@/lib/site";
import { normalize, validate, type FieldErrors } from "@/lib/validate";

export default function InquiryForm({ mode, defaultType }: { mode: "contact" | "quote"; defaultType?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "bad">("idle");
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = normalize({ ...Object.fromEntries(new FormData(form)), mode });
    const errs = validate(data);
    setErrors(errs);
    if (Object.keys(errs).length) { setState("bad"); setMsg("Please correct the highlighted fields."); return; }
    setState("sending"); setMsg("");
    try {
      const res = await fetch("/api/inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) { setState("ok"); setMsg("Thank you. Your message was sent and we will respond by email."); form.reset(); }
      else { if (json.errors) setErrors(json.errors); setState("bad"); setMsg(json.error ?? "Something went wrong. Please try again."); }
    } catch { setState("bad"); setMsg("Network problem. Please check your connection and try again."); }
  }

  const f = (k: keyof FieldErrors) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `${k}-e` : undefined });
  const E = ({ k }: { k: keyof FieldErrors }) => (errors[k] ? <p className="err" id={`${k}-e`}>{errors[k]}</p> : null);

  return (
    <form onSubmit={submit} noValidate>
      <div role="status" aria-live="polite">{msg && <div className={`status ${state === "ok" ? "ok" : "bad"}`}>{msg}</div>}</div>
      <div className="f"><label htmlFor="name">Your name</label><input id="name" name="name" autoComplete="name" required {...f("name")} /><E k="name" /></div>
      <div className="f"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required {...f("email")} /><E k="email" /></div>
      <div className="f"><label htmlFor="organization">Organization <span className="opt">(optional)</span></label><input id="organization" name="organization" autoComplete="organization" /></div>
      <div className="f"><label htmlFor="type">What is this about?</label>
        <select id="type" name="type" defaultValue={defaultType ?? ""} required {...f("type")}><option value="" disabled>Select one</option>{inquiryTypes.map((t) => <option key={t}>{t}</option>)}</select><E k="type" /></div>
      {mode === "quote" && (<>
        <div className="f"><label htmlFor="scope">Project scope</label><textarea id="scope" name="scope" placeholder="What do you want to build or solve? Who will use it?" {...f("scope")} /><E k="scope" /></div>
        <div className="f"><label htmlFor="budget">Budget range <span className="opt">(optional)</span></label>
          <select id="budget" name="budget" defaultValue="" {...f("budget")}><option value="">Choose a range</option>{budgetRanges.map((b) => <option key={b}>{b}</option>)}</select></div>
      </>)}
      <div className="f"><label htmlFor="message">{mode === "quote" ? "Anything else we should know" : "Message"}</label><textarea id="message" name="message" required {...f("message")} /><E k="message" /></div>
      <div className="hp" aria-hidden="true"><label htmlFor="website">Leave this empty</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <button className="btn" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : mode === "quote" ? "Send project inquiry" : "Send message"}</button>
      <p className="opt" style={{ marginTop: 12 }}>We use your details only to respond to this inquiry. See our <a href="/privacy">Privacy Policy</a>.</p>
    </form>
  );
}
