import { redirect } from "next/navigation";
import { adminConfig } from "@/lib/auth";
import { isAdmin } from "@/lib/admin-session";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function Login() {
  if (await isAdmin()) redirect("/admin");
  const cfg = adminConfig();
  return (
    <div className="form-card" style={{ maxWidth: 440, margin: "40px auto" }}>
      <h1 style={{ fontSize: "1.6rem" }}>Admin sign in</h1>
      {cfg.ok ? (
        <LoginForm />
      ) : (
        <div className="alert info">
          <p><strong>The admin area is locked because it is not configured.</strong></p>
          <p style={{ marginTop: 8 }}>Set <code>ADMIN_PASSWORD</code> (12+ characters) and <code>ADMIN_SESSION_SECRET</code> (32+ characters) in your environment variables, then restart. See HANDOVER.md.</p>
        </div>
      )}
    </div>
  );
}
