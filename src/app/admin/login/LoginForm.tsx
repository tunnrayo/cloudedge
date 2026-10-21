"use client";
import { useActionState } from "react";
import { login, type LoginState } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action}>
      <div role="alert">{state.error && <div className="alert bad"><p>{state.error}</p></div>}</div>
      <div className="field">
        <label htmlFor="password">Admin password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%" }}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
