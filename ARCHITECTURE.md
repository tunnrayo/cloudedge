# Architecture

```
Browser ── Next.js app (one service on Railway)
            ├─ Pages: company site + shop (server-rendered; cart kept in browser localStorage)
            ├─ /api/cart/quote ─────────── indicative prices from DB
            ├─ /api/checkout ───────────── validate → SOURCING REQUEST (no payment; idempotent by request id)
            ├─ /orders/:n (+ server action) customer views quotation → accept / decline
            ├─ /api/orders/:n/pay ──────── only when an accepted quotation awaits payment → Paystack initialize
            ├─ /checkout/complete ──────── Paystack redirect → VERIFY via Paystack API → Payment confirmed (idempotent)
            ├─ /api/paystack/webhook ───── HMAC-SHA512 check → dedupe → VERIFY via API → Payment confirmed
            ├─ /admin (proxy.ts + requireAdmin) ── orders, sourcing, refunds (Paystack refund API), products, images
            └─ /api/health ─────────────── DB check for Railway
          PostgreSQL: products, product_images, customers, customer_sessions, orders, order_items,
                      payments, webhook_events, order_events, refunds, quotes, quote_lines,
                      manual_payments, inquiries, meta, schema_migrations
```

## Data model (docs/database/schema.sql)
- **products** — catalogue fields incl. reference amount/currency/label/type/source URL, fx_rate, markup, price_ngn (selling), listed_price_ngn (document), verification status/date/note, supplier, fulfilment type/note, delivery estimate, resale_status, sale_mode, status, quantity/option settings, image.
- **orders** — customer + billing details, status, payment_status, totals in kobo, refunded_kobo, payment_reference, payment_mode (test/live), access_token_hash (guest link).
- **order_items** — snapshot of product/price at purchase + sourcing fields (supplier, link, availability, quoted price, actual cost, ETA, tracking, expected date, notes, delivery details).
- **payments** — every initialize/verify result; **webhook_events** — SHA-256 of each webhook body (dedupe); **order_events** — history/communication log (customer-visible flag, email status); **refunds**.

- **quotes / quote_lines** — versioned quotations (draft → sent → accepted/declined/expired/superseded); lines hold supplier, currency, unit cost, FX, fees, taxes, delivery, margin, calculated cost and price (internal fields never shown to customers). `orders.accepted_quote_id` points to the accepted version; `orders.total_kobo` = accepted (or sent) quote total; `indicative_total_kobo` = catalogue estimate.
- **manual_payments** — bank transfer / other payments recorded by an admin (method, reference, amount, date, note).
- order_items also hold the fulfilment record: supply_evidence, licence_type, region_eligibility, region_notes, actual_fulfilment_date, delivery_method.

## Order statuses (src/lib/shop/workflow.ts — single source of the rules)
Request received → Reviewing request → Sourcing in progress → Supplier option found → Availability confirmed → Quote sent to customer → (Awaiting customer approval) → Awaiting payment → Payment confirmed → Supplier order in progress → Licence ready for delivery → Fulfilled. Side exits: Unavailable, Cancelled, Refund pending → Refunded.
Automatic only: Quote sent (sending a quote), Awaiting payment (customer acceptance), Payment confirmed (verified Paystack payment or recorded manual payment), Refunded (refund records). Admins choose only from `allowedNextStatuses()`; the server re-checks with `transitionError()`. Paid orders cannot be Cancelled/Unavailable (→ Refund pending). Fulfilled requires `fulfilmentGaps()` to be empty for every item.

## Security
Server-side prices and quotation maths; supplier data only in admin pages/CSV; Paystack secret only on the server; signed + deduplicated webhooks; idempotent payment updates; no card data stored; scrypt passwords, hashed session tokens, http-only cookies; admin protected twice (proxy + per-page/action check), login rate limit; same-origin checks on POST APIs; CSP/HSTS/frame/nosniff headers; uploads type- and magic-byte-checked, served with nosniff + restrictive CSP; CSV formula injection neutralised; parameterised SQL everywhere.

## Persistence on Railway
Everything durable is in PostgreSQL (including uploaded images). The app filesystem is treated as disposable. PGlite (local file DB) is refused in production unless explicitly allowed.


## Platform (v0.5.0)
- **Admin sessions:** cookie `ce_admin` = 64-hex random token (HttpOnly, SameSite=Strict, Secure in production). Table `admin_sessions` stores only HMAC-SHA256(token, ADMIN_SESSION_SECRET), created/last-seen/expires/revoked. Lifetime 8 h, idle 2 h. Logout revokes; sign-in revokes the session of an old cookie presented with it; "Sign out all other devices". `src/proxy.ts` only checks the cookie shape; every admin page, server action and download calls `requireAdmin()` which validates against the database and fails closed. Sign-in attempts in `admin_login_attempts` (hashed IP): 5 failures per IP and 60 global per 15 minutes.
- **Audit log:** `audit_log` is append-only (trigger rejects UPDATE/DELETE). `writeAudit` (throws; used inside the same transaction as the change) and `recordAudit` (never throws; failures counted and shown on Health). `redact()` strips secrets/tokens from details. Viewer: `/admin/audit`.
- **Services:** table `services` (draft/published/inactive, sort order, category, optional price text, optional image). Seeded once from `defaultServices` in `src/lib/site.ts` (marker `services_seeded` in `meta`). Public pages read through `getPublishedServices()` (30 s cache, cleared on edits, falls back to the built-in list if the database fails). `inquiryTypes` for forms is the static list derived from the defaults.
- **Health:** `runHealth()` assembles checks from `health-core.ts`; secrets are never part of results. Public `/api/health` = `{ok}` only.
- **Request guard:** `readJson` (415/413/400) and `sameOrigin` for all public POST routes.
- **Email:** `sendViaResend` — validated addresses, single-line subject, one retry (network/429/5xx) with the same Idempotency-Key, result is only `sent` or `failed`.
- **Rate limiter limitation:** public-form limits are per-process memory (see PROJECT_STATUS). A shared limiter was not built because a single Railway instance is the intended deployment; admin sign-in limiting is database-backed.
