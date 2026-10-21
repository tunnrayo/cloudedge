"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { inquiryTypes, budgetRanges, timelines, company } from "@/lib/site";
import { normalize, validate, LIMITS, type FieldErrors, type InquiryInput } from "@/lib/validate";
import { Svg } from "@/components/Icon";

type Props = { mode: "contact" | "quote"; defaultType?: string; product?: { slug: string; name: string } };
type State = { kind: "idle" } | { kind: "sending" } | { kind: "ok"; ref?: string; note?: string } | { kind: "error"; message: string };

function FieldError({ id, msg }: { id: string; msg?: string }) {
  return msg ? <p className="err" id={id}>{msg}</p> : null;
}

export default function InquiryForm({ mode, defaultType, product }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const a = (k: keyof InquiryInput) => ({
    "aria-invalid": errors[k] ? (true as const) : undefined,
    "aria-describedby": errors[k] ? `${k}-err` : undefined,
  });

  function focusFirstError(errs: FieldErrors) {
    const first = Object.keys(errs)[0];
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "sending") return;
    const data = normalize({ ...Object.fromEntries(new FormData(e.currentTarget)), mode });
    const errs = validate(data);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setState({ kind: "error", message: "Please correct the highlighted fields below." });
      focusFirstError(errs);
      return;
    }
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setState({ kind: "ok", ref: json.reference, note: json.note });
        formRef.current?.reset();
        window.scrollTo({ top: (formRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 120, behavior: "smooth" });
      } else {
        if (json.errors) { setErrors(json.errors); focusFirstError(json.errors); }
        setState({ kind: "error", message: json.error ?? `Something went wrong. Please try again, or email ${company.email}.` });
        alertRef.current?.focus();
      }
    } catch {
      setState({ kind: "error", message: `We could not reach the server. Check your internet connection and try again, or email ${company.email}.` });
      alertRef.current?.focus();
    }
  }

  if (state.kind === "ok") {
    return (
      <div className="success-panel" role="status" aria-live="polite">
        <span className="ico"><Svg name="check" /></span>
        <h2 style={{ fontSize: "1.5rem" }}>Thank you — your {mode === "quote" ? "project inquiry" : "message"} has been received.</h2>
        {state.ref && <p>Your reference is <span className="ref">{state.ref}</span>. Please quote it if you contact us about this inquiry.</p>}
        <p className="muted">We will reply to the email address you provided.{state.note ? ` ${state.note}` : ""}</p>
        <div className="actions" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-outline" onClick={() => { setState({ kind: "idle" }); setErrors({}); }}>Send another message</button>
          <Link className="btn btn-primary" href="/services">Explore services <Svg name="arrow" /></Link>
        </div>
      </div>
    );
  }

  const sending = state.kind === "sending";
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-busy={sending} aria-describedby="form-note">
      <div ref={alertRef} tabIndex={-1} role="alert" aria-live="assertive">
        {state.kind === "error" && <div className="alert bad"><p>{state.message}</p></div>}
      </div>

      {product && (
        <div className="alert info"><p>You are enquiring about: <strong>{product.name}</strong></p></div>
      )}
      <input type="hidden" name="product" value={product?.slug ?? ""} />

      <div className="field-row">
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" autoComplete="name" required maxLength={LIMITS.name} {...a("name")} />
          <FieldError id="name-err" msg={errors.name} />
        </div>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={LIMITS.email} {...a("email")} />
          <FieldError id="email-err" msg={errors.email} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="phone">Phone number <span className="opt">(optional)</span></label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={LIMITS.phone} placeholder="+234 …" {...a("phone")} />
          <FieldError id="phone-err" msg={errors.phone} />
        </div>
        <div className="field">
          <label htmlFor="organization">Organisation <span className="opt">(optional)</span></label>
          <input id="organization" name="organization" autoComplete="organization" maxLength={LIMITS.organization} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="type">{mode === "quote" ? "Service needed" : "What is this about?"}</label>
        <select id="type" name="type" defaultValue={defaultType ?? ""} required {...a("type")}>
          <option value="" disabled>Select one</option>
          {inquiryTypes.map((t) => <option key={t}>{t}</option>)}
        </select>
        <FieldError id="type-err" msg={errors.type} />
      </div>

      {mode === "quote" && (
        <>
          <div className="field">
            <label htmlFor="scope">Project description</label>
            <textarea id="scope" name="scope" required maxLength={LIMITS.scope} aria-describedby={errors.scope ? "scope-err" : "scope-hint"} aria-invalid={errors.scope ? true : undefined}
              placeholder="What do you want to build or solve? Who will use it? Any features you already know you need?" />
            {errors.scope ? <FieldError id="scope-err" msg={errors.scope} /> : <p className="hint" id="scope-hint">A few sentences is enough. We will ask follow-up questions by email.</p>}
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="timeline">Preferred timeline <span className="opt">(optional)</span></label>
              <select id="timeline" name="timeline" defaultValue="" {...a("timeline")}>
                <option value="">Choose a timeline</option>
                {timelines.map((t) => <option key={t}>{t}</option>)}
              </select>
              <FieldError id="timeline-err" msg={errors.timeline} />
            </div>
            <div className="field">
              <label htmlFor="budget">Budget range <span className="opt">(optional)</span></label>
              <select id="budget" name="budget" defaultValue="" {...a("budget")}>
                <option value="">Choose a range</option>
                {budgetRanges.map((b) => <option key={b}>{b}</option>)}
              </select>
              <FieldError id="budget-err" msg={errors.budget} />
            </div>
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="message">{mode === "quote" ? <>Anything else we should know <span className="opt">(optional)</span></> : "Message"}</label>
        <textarea id="message" name="message" required={mode === "contact"} maxLength={LIMITS.message} style={mode === "quote" ? { minHeight: 100 } : undefined} {...a("message")} />
        <FieldError id="message-err" msg={errors.message} />
      </div>

      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="form-foot">
        <button className="btn btn-primary" type="submit" disabled={sending}>
          {sending ? <><span className="spinner" aria-hidden="true" /> Sending…</> : <>{mode === "quote" ? "Send project inquiry" : "Send message"} <Svg name="arrow" /></>}
        </button>
        <p id="form-note">We use your details only to respond to this inquiry. See our <Link href="/privacy">Privacy Policy</Link>.</p>
      </div>
    </form>
  );
}
