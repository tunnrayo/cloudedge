# Handover — continuing this project in another Claude account

Say: *"Continue the Cloud Edge website in https://github.com/tunnrayo/cloudedge. Read HANDOVER.md and PROJECT_STATUS.md first. Do not rebuild completed work."*

## Current state
v0.3.0 — company website + e-commerce shop (catalogue, cart, Paystack checkout, orders, accounts, admin sourcing queue). All tests pass.
**Not deployed.** Git: branch `main`, remote `origin` = https://github.com/tunnrayo/cloudedge.git (private). Never force-push.

## Fixed facts (change only on the owner's instruction)
Cloud Edge Technology Services Limited · RC 9922715 · Suite 306B, Samfa Plaza, Ndola Crescent, Wuse Zone 5, Abuja, FCT, Nigeria · CLOUDEDGETECHNOLOGYSERVICES@GMAIL.COM.
Never invent phones, staff, clients, reviews, ratings, reseller status, licence keys or availability.

## Structure
```
src/content/catalogue.ts      SEED catalogue (61 products from the 2 Word docs) — used once to fill the DB
src/content/projects.ts       portfolio demo concepts
src/lib/db.ts                 PostgreSQL (DATABASE_URL) or PGlite locally; runs migrations + seed on first use
src/lib/migrations.ts         numbered SQL migrations (add new ones; never edit deployed ones)
src/lib/shop/
  products.ts                 product queries, purchaseBlockers() rule
  orders.ts                   quote, createOrder, startPayment, confirmPayment (idempotent), admin operations
  paystack.ts / signature.ts  Paystack API calls + webhook HMAC check
  mail.ts                     customer/staff email templates (Resend)
  customers.ts                accounts (scrypt), DB sessions
  seed.ts, format.ts, checkout-validate.ts
src/app/(site)/products|cart|checkout|orders|account|refund-policy …   storefront pages
src/app/api/cart/quote, checkout, paystack/webhook, orders/[number]/pay, images/[id], health, inquiry
src/app/admin/                dashboard, orders (+[id], export), products (+[id], new), inquiries; shop-actions.ts
src/components/shop/          cart store (localStorage), CartIcon, AddToCart, CartView, CheckoutForm, ProductCard, Catalogue …
public/products/*.svg         generated product images; docs/product-image-manifest.json
scripts/                      unit tests, image generator, catalogue report, db-setup
tests/e2e/                    browser end-to-end suites + mock Paystack
```

## Key decisions
- **Database is the source of truth** for products after the first import; the admin manages them (no code edits).
- **Purchase guardrail:** online purchase only when published + resale *authorised* + price not *needs_verification* + fulfilment available (enforced at save, bulk action and checkout).
- **Payments:** Paystack hosted checkout; server verifies every payment via API; webhook signed + deduplicated; conditional UPDATE makes confirmation idempotent; amount/currency/reference must match or the order goes to *payment review*.
- **Fulfilment:** manual sourcing workflow (no supplier APIs available). On-hold → customer approve/cancel instead of silent price changes.
- **Images:** official brand logos (CC0/MIT packages) composed per product — no AI images, no fake screenshots; uploads stored in Postgres (bytea) so they persist on Railway.
- **Prices:** formula price used where the documents' arithmetic was wrong; document price kept in `listed_price_ngn`.

## Commands
`npm install` · `npm run dev` · `npm run check` · `npm start` · `npm run db:setup` · `npm run images:generate` · `npm run catalogue:report` · e2e: tests/e2e/README.md

## Known problems / limits
See PROJECT_STATUS.md → Known limitations. Sandbox note: shells may lack brace expansion; create folders one by one.
