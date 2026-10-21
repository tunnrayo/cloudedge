# Cloud Edge Technology Services Limited — Website & Online Shop

Company website **and** e-commerce shop for software subscriptions and digital products:
61-product catalogue, cart, Paystack checkout, verified payments, order tracking, customer accounts,
and an admin area with a manual **sourcing queue** for fulfilling orders.

**Technology:** Next.js 16 + React 19 + TypeScript · PostgreSQL · Paystack (payments) · Resend (emails, optional).
One project contains the pages, the server code (APIs, payments, admin) and the database migrations — no separate backend.

> New here? Read this file, then **PROJECT_STATUS.md** (what works / what is missing), **DEPLOYMENT.md** (go live on Railway)
> and **docs/CATALOGUE.md** (products and why they are not yet sold online).

---

## 1. What you need
| Need | Check | Get it |
|---|---|---|
| Node.js **20.9+** (22 LTS recommended) | `node -v` | https://nodejs.org (LTS) |
| Git (to update GitHub/Railway) | `git --version` | https://git-scm.com |

Opening a terminal: Windows → Start → type **PowerShell**. Mac → Cmd+Space → **Terminal**.

## 2. Run it on your computer (no database installation needed)
1. Get the code: `git clone https://github.com/tunnrayo/cloudedge.git` then `cd cloudedge`
   (or unzip the project and `cd` into the folder).
2. `npm install` — ✅ ends with `added … packages`; `npm warn` lines are fine.
3. Create settings: `cp .env.example .env.local` (Windows: `copy .env.example .env.local`).
4. Open `.env.local` and set at least:
   ```
   ADMIN_PASSWORD=choose-a-long-password
   ADMIN_SESSION_SECRET=paste-64-random-characters
   ```
   Make the secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   To test checkout, also add your Paystack **test** key: `PAYSTACK_SECRET_KEY=sk_test_...` (Paystack dashboard → Settings → API Keys).
5. `npm run dev` — ✅ shows `Local: http://localhost:3000`. Open it. Stop with **Ctrl + C**.

Without `DATABASE_URL`, a built-in local PostgreSQL engine stores everything in `.data/pglite` on your computer.
The 61 catalogue products are imported automatically the first time. Admin: http://localhost:3000/admin

## 3. Commands
| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / run it |
| `npm run check` | Typecheck + lint + unit tests + build (run before every deploy) |
| `npm test` | 30 unit tests (pricing, catalogue, webhook signature, validation, admin login) |
| `npm run db:setup` | Create all tables in `DATABASE_URL` (optional — the site does this itself) |
| `npm run images:generate` | Rebuild the 61 product images + manifest (only if the seed catalogue changes) |
| `npm run catalogue:report` | Rebuild docs/CATALOGUE.md and docs/database/schema.sql |
| End-to-end tests | See tests/e2e/README.md |

## 4. Pages
**Shop:** `/products` (search, category, billing, price, availability, sort) · `/products/category/<name>` · `/products/<product>` · `/cart` · `/checkout` · `/checkout/complete` · `/orders/<number>` · `/account` (+ login/register).
**Company:** `/` · `/about` · `/services` (+8) · `/solutions` · `/portfolio` · `/contact` · `/quote` · `/faq` · `/search` · `/privacy` · `/terms` · `/refund-policy`.
**Admin (`/admin`, password):** Dashboard · Orders · Sourcing queue · Products · Inquiries.

## 5. Day-to-day tasks (no coding)
| Task | Where |
|---|---|
| Allow a product to be bought online | Admin → Products → product → *Resale permission: authorised* → *Price verification* not "needs verification" → *Sale mode: Buy online* → Save |
| Change a price | Admin → Products → product → Pricing (tick *Recalculate* to apply reference × rate + markup) |
| Hide / add / delete a product | Admin → Products (bulk actions, *Add product*, *Delete*) |
| Replace a product image | Admin → Products → product → Image (PNG/JPEG/WebP ≤ 2 MB, stored in the database) |
| Fulfil an order | Admin → Sourcing queue → order → per item: supplier, link, price, **your cost**, ETA, tracking, status → mark *Delivered* with activation details → set order *Fulfilled* |
| Supplier price changed | Set order **On hold** with a message → customer approves or asks for refund on their order page |
| Refund | Admin → order → Refund (through Paystack, or record a manual refund) |
| Company text, services, FAQ | `src/lib/site.ts` · Legal pages: `src/app/(site)/privacy|terms|refund-policy/page.tsx` |

## 6. Troubleshooting
| Problem | Fix |
|---|---|
| `npm` not found | Install Node.js LTS, reopen the terminal |
| Checkout says payment is not set up | Set `PAYSTACK_SECRET_KEY` and restart/redeploy |
| Admin is "locked" | Set `ADMIN_PASSWORD` (12+) and `ADMIN_SESSION_SECRET` (32+) |
| `/api/health` shows database unavailable | `DATABASE_URL` wrong or database stopped — check Railway |
| Styles look old after edits | Stop server, delete `.next`, `npm run dev` |
| Local data looks wrong and you want to start fresh | Stop the server and delete the `.data` folder (local only — never on the live site) |
