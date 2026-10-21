# Architecture

```
Browser ── Next.js app (one service on Railway)
            ├─ Pages: company site + shop (server-rendered; cart kept in browser localStorage)
            ├─ /api/cart/quote ─────────── prices from DB
            ├─ /api/checkout ───────────── validate → server total → pending order → Paystack initialize
            ├─ /checkout/complete ──────── Paystack redirect → VERIFY via Paystack API → mark paid (idempotent)
            ├─ /api/paystack/webhook ───── HMAC-SHA512 check → dedupe → VERIFY via API → mark paid
            ├─ /api/orders/:n/pay ──────── retry payment with a new reference
            ├─ /admin (proxy.ts + requireAdmin) ── orders, sourcing, refunds (Paystack refund API), products, images
            └─ /api/health ─────────────── DB check for Railway
          PostgreSQL: products, product_images, customers, customer_sessions, orders, order_items,
                      payments, webhook_events, order_events, refunds, inquiries, meta, schema_migrations
```

## Data model (docs/database/schema.sql)
- **products** — catalogue fields incl. reference amount/currency/label/type/source URL, fx_rate, markup, price_ngn (selling), listed_price_ngn (document), verification status/date/note, supplier, fulfilment type/note, delivery estimate, resale_status, sale_mode, status, quantity/option settings, image.
- **orders** — customer + billing details, status, payment_status, totals in kobo, refunded_kobo, payment_reference, payment_mode (test/live), access_token_hash (guest link).
- **order_items** — snapshot of product/price at purchase + sourcing fields (supplier, link, availability, quoted price, actual cost, ETA, tracking, expected date, notes, delivery details).
- **payments** — every initialize/verify result; **webhook_events** — SHA-256 of each webhook body (dedupe); **order_events** — history/communication log (customer-visible flag, email status); **refunds**.

## Order statuses
pending_payment → paid → processing → awaiting_activation → fulfilled; side paths: on_hold (customer decision), payment_review (mismatch), failed (retry allowed), cancelled, refunded / partially_refunded.
Item sourcing: sourcing_required → supplier_confirmed → ordered_from_supplier → shipped → delivered (or cancelled_refunded). An order can only be *fulfilled* when every item is delivered/cancelled, and only a verified payment can make it *paid*.

## Security
Server-side prices; Paystack secret only on the server; signed + deduplicated webhooks; idempotent payment updates; no card data stored; scrypt passwords, hashed session tokens, http-only cookies; admin protected twice (proxy + per-page/action check), login rate limit; same-origin checks on POST APIs; CSP/HSTS/frame/nosniff headers; uploads type- and magic-byte-checked, served with nosniff + restrictive CSP; CSV formula injection neutralised; parameterised SQL everywhere.

## Persistence on Railway
Everything durable is in PostgreSQL (including uploaded images). The app filesystem is treated as disposable. PGlite (local file DB) is refused in production unless explicitly allowed.
