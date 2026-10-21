"use client";
import Link from "next/link";
import { useActionState } from "react";
import { login, register, type AuthState } from "@/app/(site)/account/actions";

function Err({ id, msg }: { id: string; msg?: string }) { return msg ? <p className="err" id={id}>{msg}</p> : null; }

export function LoginForm({ next }: { next: string }) {
  const [s, action, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="form-card">
      <div role="alert">{s.error && <div className="alert bad"><p>{s.error}</p></div>}</div>
      <input type="hidden" name="next" value={next} />
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={s.values?.email} required /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className="small" style={{ marginTop: 14 }}>New here? <Link href={`/account/register?next=${encodeURIComponent(next)}`}>Create an account</Link>. Forgot your password? Email us from your account address and we will help.</p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [s, action, pending] = useActionState<AuthState, FormData>(register, {});
  const f = s.fields ?? {};
  const a = (k: string) => ({ "aria-invalid": f[k] ? (true as const) : undefined, "aria-describedby": f[k] ? `${k}-err` : undefined });
  return (
    <form action={action} className="form-card">
      <div role="alert">{s.error && <div className="alert bad"><p>{s.error}</p></div>}</div>
      <input type="hidden" name="next" value={next} />
      <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" defaultValue={s.values?.name} required {...a("name")} /><Err id="name-err" msg={f.name} /></div>
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={s.values?.email} required {...a("email")} /><Err id="email-err" msg={f.email} /></div>
      <div className="field"><label htmlFor="phone">Phone <span className="opt">(optional)</span></label><input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={s.values?.phone} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" required {...a("password")} /><Err id="password-err" msg={f.password} /><p className="hint">At least 10 characters.</p></div>
        <div className="field"><label htmlFor="confirm">Confirm password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" required {...a("confirm")} /><Err id="confirm-err" msg={f.confirm} /></div>
      </div>
      <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
      <p className="small" style={{ marginTop: 14 }}>Already registered? <Link href={`/account/login?next=${encodeURIComponent(next)}`}>Sign in</Link>.</p>
    </form>
  );
}
