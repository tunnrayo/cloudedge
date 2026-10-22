# Deployment Guide — putting the shop online (Railway)

**Current state:** v0.4.0 is on GitHub (https://github.com/tunnrayo/cloudedge, branch `main`); v0.5.0 is local and not yet pushed. Nothing has been deployed:
that needs your Railway, Paystack and (optionally) Resend accounts. Prices checked 21 Oct 2026 — confirm on each provider's site.

| Item | Needed? | Cost (Oct 2026) |
|---|---|---|
| Railway (website + PostgreSQL) | Yes | One-time US$5 trial credit, then Hobby US$5/month including US$5 of usage; usage above that is billed |
| Paystack business account | Yes, for payments | No monthly fee; per-transaction fees (see paystack.com/pricing) |
| Domain name | Recommended | Yearly fee to a registrar |
| Resend (emails) | Recommended | Free plan: 100 emails/day, 3,000/month |

---

## Step 1 — Railway project with database
1. https://railway.com → **Login with GitHub** → **New Project** → **Deploy from GitHub repo** → `tunnrayo/cloudedge`.
   (If the repo is not listed, click *Configure GitHub App* and give Railway access to it.)
2. In the project: **+ Create → Database → PostgreSQL**. Wait until it is running.
3. Click the **website service** → **Settings → Networking → Generate Domain**. Copy the address (e.g. `https://cloudedge-production.up.railway.app`).
4. Website service → **Variables** → add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway links it to the database) |
| `SITE_URL` | the address from step 3 (later your domain) — no trailing slash |
| `NEXT_PUBLIC_SITE_URL` | same as `SITE_URL` |
| `ADMIN_PASSWORD` | long password only you know (12+ characters) |
| `ADMIN_SESSION_SECRET` | 64 random characters (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `SHOW_DEMO_PROJECTS` | leave **unset** (demo portfolio concepts stay hidden) |
| `PAYSTACK_SECRET_KEY` | your **test** secret key `sk_test_…` to start (Step 2) |
| `PAYMENTS_LIVE_ENABLED` | leave **unset** until live payments are verified (Step 2.4) |
| `CONTACT_WHATSAPP` | optional — only a real company WhatsApp number |

5. Railway redeploys. Build uses `npm run build`; start uses `npm start`; health check is `/api/health` (configured in `railway.json`).
   ✅ Deploy logs show `[db] applied migration 1 shop_core` and `[db] imported 61 catalogue products` on the first start, then `Ready`.
6. Open `https://YOUR-ADDRESS/api/health` → ✅ `{"ok":true}` (it deliberately shows nothing else). Then sign in at `/admin/login` and open **Health** for the detailed checks.

**Persistence:** orders, customers, products and uploaded images are stored in PostgreSQL, so redeploys do not lose them.
Do not rely on the app's own disk on Railway (it is reset on each deploy). Enable Postgres backups in Railway if your plan offers them, and use Admin → Orders → Export CSV regularly.

## Step 2 — Paystack (test first, then live)
1. Create an account at https://dashboard.paystack.com. Test mode works immediately.
2. **Settings → API Keys & Webhooks**:
   - copy the **Test Secret Key** (`sk_test_…`) into Railway `PAYSTACK_SECRET_KEY`;
   - set **Test Webhook URL** to `https://YOUR-ADDRESS/api/paystack/webhook`;
   - set **Test Callback URL** to `https://YOUR-ADDRESS/checkout/complete` (the site also sends its own callback per payment).
3. On the deployed site: request a product → in Admin send a quotation → accept it on the request page → pay with one of Paystack's test cards (listed in Paystack's *Test Payments* documentation), and confirm:
   - you return to "Payment confirmed"; the order shows **Payment confirmed** and **TEST PAYMENT** in Admin;
   - the order's history shows "Payment … verified with Paystack".
4. **Going live** (only after your Paystack business account is activated — Paystack asks for business registration details):
   replace `PAYSTACK_SECRET_KEY` with the **Live Secret Key** `sk_live_…`, set the **Live Webhook URL** to the same webhook address,
   add `PAYMENTS_LIVE_ENABLED=true` (without it, live online payment stays switched off as a safety measure), redeploy,
   and make one small real payment on a real quotation to verify. The admin dashboard shows **LIVE** when live keys are active.
   No code changes are needed to switch from test to live.

## Step 3 — Emails (recommended)
1. https://resend.com → add and verify your domain (DNS records at your registrar) → create an API key.
2. Railway variables: `RESEND_API_KEY`, `SHOP_FROM_EMAIL` (e.g. `Cloud Edge Orders <orders@yourdomain.com>`), `INQUIRY_FROM_EMAIL`,
   optionally `SHOP_NOTIFY_EMAIL` / `INQUIRY_TO_EMAIL` (default: the official company email).
3. Redeploy and place a test order: Admin → order → History shows **email sent**.

## Step 4 — Products and requests
No product is sold directly. Every published product can be **requested**; customers pay only after accepting a quotation.
Prices on the site are indicative. To stop requests for a product: Admin → Products → select it → *Mark unavailable*.
Optional: set `CONTACT_WHATSAPP` to a real company WhatsApp number to show a WhatsApp link on request pages.

## Step 5 — Your own domain
1. Railway → website service → **Settings → Networking → Custom Domain** → `www.yourdomain.com`.
2. Add the DNS record Railway shows (usually CNAME) at your registrar; wait until Railway shows it active (HTTPS is automatic).
3. Update `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to `https://www.yourdomain.com`, and the Paystack webhook/callback URLs. Redeploy.

## Updating the live site
Edit → `npm run check` → `git add -A && git commit -m "…" && git push`. Railway redeploys automatically from `main`.
Database changes are applied automatically by numbered migrations (`src/lib/migrations.ts`) on start.

## Final live checklist
- [ ] `/api/health` ok, database `postgres`
- [ ] Admin login works; dashboard shows the right payment mode
- [ ] Test purchase → Paid → appears in Sourcing queue
- [ ] Webhook delivery succeeds (Paystack dashboard → Webhooks logs)
- [ ] Order and payment emails arrive (if Resend configured)
- [ ] Refund test in test mode
- [ ] Switch to live keys; one small real purchase; refund it if desired


---
# Railway readiness details (v0.5.0)

## A. Before the first deploy
- Use a **different** strong `ADMIN_PASSWORD` (16+ characters) and a **separate** random `ADMIN_SESSION_SECRET` (generate with the command above). Never reuse the example values from the tests.
- `DATABASE_URL` must be the Railway PostgreSQL reference `${{Postgres.DATABASE_URL}}`. If it is missing in production the site **refuses** to use a local database: `/api/health` answers 503 and the admin Health page shows FAIL. (`ALLOW_PGLITE_IN_PRODUCTION=true` overrides this only for experiments; data is lost on each redeploy.)
- Set `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to the final public https address (no trailing slash). Changing `NEXT_PUBLIC_SITE_URL` needs a **new build**.
- Migrations run automatically on start (a database lock stops two instances from migrating at once). Never edit an existing migration; add a new one.
- Files to confirm: `railway.json` (build `npm run build`, start `npm start`, health check `/api/health`).

## B. Local database vs live database
| | Your computer | Railway |
|---|---|---|
| `DATABASE_URL` | empty | `${{Postgres.DATABASE_URL}}` |
| Database | built-in PGlite in `.data/pglite` (created automatically, including parent folders; override with `PGLITE_DIR`) | PostgreSQL service |
| Data survives redeploy? | yes (your folder) | yes (Postgres) — the app disk is **not** used |

## C. Paystack (test first)
1. Paystack dashboard → Settings → API Keys & Webhooks → copy the **test** secret key (`sk_test_…`) into `PAYSTACK_SECRET_KEY`.
2. Set the **test webhook URL** to `https://YOUR-DOMAIN/api/paystack/webhook`.
3. Do a full test: request → quotation → accept → pay with a Paystack test card. Then admin → Health shows *Paystack webhook deliveries: PASS* only after Paystack really called the webhook, and *Test Paystack connection* confirms the key.
4. Live keys stay OFF for customers until `PAYMENTS_LIVE_ENABLED=true`. Nothing in this project has been verified against the real Paystack.

## D. Email (Resend)
Add and verify your sending domain in Resend (DNS records at your registrar), create an API key, set `RESEND_API_KEY`, `INQUIRY_FROM_EMAIL` (address on the verified domain), optionally `INQUIRY_TO_EMAIL`, `SHOP_FROM_EMAIL`. Then Admin → Health → **Test email connection** (it checks the key and that the sender domain is verified; it does not send a message). Send a real test inquiry to confirm delivery. Until then emails show as "not configured" and inquiries are still saved.

## E. Logs, backups, recovery
- Logs: Railway → service → Deployments → View logs. The app never logs passwords, keys, session tokens or message text. Look for `[db] applied migration …` after deploys.
- Backups: Railway PostgreSQL → Backups (plan dependent). Also export CSVs (Admin → Orders / Inquiries). To restore: create a new Postgres service, restore the backup into it, point `DATABASE_URL` at it, redeploy.
- Failed deploy: Railway → Deployments → open the last good deployment → **Redeploy**. Database migrations are additive; a rollback of the app keeps working with the newer tables. If `/api/health` is 503, read the logs, then Admin → Health (if you can sign in) for the failing check.
- Images and uploads live in the database; no volume is needed.

## F. After deploying — verification checklist (do these yourself; none has been run on Railway)
- [ ] `https://YOUR-DOMAIN/api/health` → `{"ok":true}`
- [ ] Admin sign-in works; wrong password is refused; **Health** shows no FAIL (WARNINGs explained)
- [ ] Health: database PASS, migrations PASS (4 applied), site address PASS, email PASS after the test button, payments TEST mode
- [ ] `/services`, a service page, `/portfolio` (empty state), `/sitemap.xml`
- [ ] Send a Contact and a Quote inquiry → appear under Admin → Inquiries; email arrives if Resend is set
- [ ] Admin → Audit log shows your sign-in and actions
- [ ] Paystack test payment end to end; webhook check turns PASS
- [ ] Sign out, then confirm `/admin` redirects to the login page

## G. How to manage services and portfolio
- **Services:** Admin → Services → *Add a service* (saved as Draft) → **Preview** → **Publish**. Use *Make inactive* to stop offering it (the old address shows a polite "not currently offered" page). A published service cannot be deleted; a service customers enquired about is kept for your records. Show prices only if the owner has approved them (price text is optional).
- **Portfolio:** add only real, approved projects in `src/content/projects.ts` (see the comments there) and redeploy. Demo concepts appear only if `SHOW_DEMO_PROJECTS=true`, labelled "Demo concepts, not client work".
