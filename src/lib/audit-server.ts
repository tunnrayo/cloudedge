import "server-only";
import { headers } from "next/headers";
import { adminConfig } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { currentAdmin } from "@/lib/admin-session";
import { recordAudit, type AuditEvent } from "@/lib/audit";
import { ipHash } from "@/lib/admin-sessions";
import { clientIp } from "@/lib/rate-limit";

/** Records an admin action. Never throws: a logging problem must not undo or block the business action. */
export async function audit(e: AuditEvent): Promise<void> {
  try {
    const cfg = adminConfig();
    const admin = e.actor ? null : await currentAdmin();
    const ip = cfg.ok ? ipHash(clientIp(await headers()), cfg.secret) : "";
    await recordAudit(await getDb(), { ...e, actor: e.actor ?? admin?.actor ?? "", ipHash: e.ipHash ?? ip });
  } catch (err) {
    console.error("[audit] could not record event:", (err as Error).name);
  }
}
