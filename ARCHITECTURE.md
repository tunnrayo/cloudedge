# Architecture

## Overview
```
Browser ──► Next.js server (one app)
             ├─ Public pages (mostly pre-rendered static HTML)
             ├─ POST /api/inquiry ──► validate ──► PostgreSQL (inquiries table)
             │                                 └─► Resend email (optional)
             ├─ proxy.ts guards /admin/* (signed cookie)
             └─ /admin pages + server actions ──► PostgreSQL
```

## Rendering
- Static: home, about, services (+details), solutions, portfolio, contact, faq, privacy, terms, product pages.
- Dynamic: `/products` (category filter via `?category=`), `/quote` (pre-selects `?service=` / `?product=`), `/search`, `/api/inquiry`, `/admin/*`.
- Minimal client JavaScript: only the header menu and the inquiry form are client components.

## Inquiry flow (`src/app/api/inquiry/route.ts`)
1. Origin check (blocks cross-site posts) → rate limit (5 per 10 min per IP) → size limit (20 KB).
2. Parse JSON → `normalize()` (trim, cap lengths, strip control chars) → honeypot `website` (bots get a fake success, nothing stored).
3. `validate()` (same rules as the browser) + product slug must exist.
4. Store (`src/lib/inquiries.ts`) → email (`src/lib/email.ts`). Email status is saved on the record.
5. Success only if stored **or** emailed. Otherwise an honest error telling the visitor the message was NOT sent and showing the company email.

## Storage selection
| Condition | Store |
|---|---|
| `DATABASE_URL` set | PostgreSQL (`pg`, pool of 5, table auto-created) |
| no DB, not production (or `INQUIRY_STORAGE=file`) | `.data/inquiries.json` (serialised writes, atomic rename) |
| neither | none (email only) |

Schema: `docs/database/schema.sql` — one table `inquiries` (UUID id, short unique reference, status, notes, email_status, form fields) with indexes on `created_at` and `status`. All queries are parameterised.

## Admin security
- `ADMIN_PASSWORD` compared via HMAC (constant time); 5 attempts / 15 min / IP + 600 ms delay on failure.
- Session = `base64url(payload{exp,nonce}).HMAC-SHA256` signed with `ADMIN_SESSION_SECRET`; cookie `ce_admin` http-only, SameSite=Strict, Secure in production, 8 h.
- Checked twice: `src/proxy.ts` (redirect) and `requireAdmin()` in every page/action; export route returns 401.
- Server actions (Next.js) also verify request origin. Admin pages are `noindex` and `no-store`.
- CSV export neutralises spreadsheet formulas.

## Other security
Security headers in `next.config.mjs`: CSP (self only), HSTS (production), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy. No secrets in code; `.env*` ignored by git. Emails escape HTML and strip header-injection characters. Logs never include form contents.

## Extending
- Products from a database/API: change only `src/lib/catalog.ts`.
- New service: add to `services` in `src/lib/site.ts`.
- Payments: deliberately not implemented (no confirmed online-sales offering).
