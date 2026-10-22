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
