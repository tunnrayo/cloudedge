# Changelog

## 0.5.0 (2026-10-22) — platform hardening: audit log, sessions, health centre, managed services
- **Bug fixed:** the local database failed on a clean setup with `ENOENT: mkdir .data/pglite` (PGlite creates only the last folder). `src/lib/local-db-path.ts` now creates the full path; regression-tested (unit + a real clean start of the app + restart keeps data). `PGLITE_DIR` supported. Production without `DATABASE_URL` still refuses to use the local database unless `ALLOW_PGLITE_IN_PRODUCTION=true`.
- **Bug fixed:** `POST /api/cart/quote` returned HTTP 500 when the list contained `null`; it now ignores junk entries. It is also rate limited (120 per 10 minutes per IP).
- **Bug fixed:** a missing/incorrect request link returned HTTP 200 with a "not found" page; it now returns a real 404 (same answer for a real order with a wrong link).
- **Admin sessions rebuilt:** random 256-bit token in an HttpOnly, SameSite=Strict cookie; the database stores only an HMAC of it; 8 h lifetime, 2 h idle timeout, logout revokes on the server, "Sign out all other devices"; sign-in attempt limit stored in the database (5 failures per IP / 60 global per 15 min) so it works across instances. Proxy checks cookie shape only; every admin page, action and download validates the session in the database and fails closed.
- **Audit log (migration 3):** append-only table (database trigger refuses UPDATE/DELETE); sign-ins, logout, inquiry/product/service/order/quote/payment/refund changes and health tests recorded with administrator id, outcome and redacted details (no passwords, keys, tokens). Admin page with filters (type, outcome, dates, text) and pagination. A failure to write an audit row never breaks the business action; failures are counted on the Health page.
- **Health centre (/admin/health):** PASS / FAIL / WARNING / NOT CONFIGURED / NOT TESTED for app, database, migrations, admin settings, site address, email, payments, webhook, sessions, audit, rate limiting; optional "Test email connection" and "Test Paystack connection" (read-only provider calls); JSON report at `/admin/health/report` (503 when a critical check fails). Public `/api/health` now returns only `{"ok":true}` or 503 `{"ok":false}`.
- **Managed services (migration 4):** admin create/edit/order/categorise/image/draft-published-inactive, preview, one-time seed of the 8 existing services (never overwrites edits, no duplicates), slug locked after publishing, inactive services keep their URL (noindex, "not currently offered"), delete blocked for published services and for services customers have enquired about; every change audited. If the database cannot be read the public pages fall back to the built-in list.
- **Portfolio:** demo concepts hidden unless `SHOW_DEMO_PROJECTS=true` (default off); polished empty state; hidden demos excluded from search and sitemap.
- **API hardening:** `readJson` (415 wrong type, 413 too large incl. streamed bodies, 400 bad JSON), stricter same-origin check (also `Sec-Fetch-Site`), header-injection protection for emails and single-line fields.
- **Email:** shared safe sender (`email-core.ts`), one retry on network/429/5xx with the same idempotency key, only "sent"/"failed", provider failure never loses an inquiry.
- **Legal pages:** Privacy updated (audit log, wording about security and review points); Terms/Refund keep their "draft, needs legal review" notices.
- **Tests:** 93 unit, 37 site e2e, 116 shop e2e (7 new payment-safety checks), 100 platform e2e. See TESTING.md.

## 0.4.0 (2026-10-22) — manual software sourcing reseller
- **Model change:** the shop no longer sells directly. Customers send a sourcing **request** (no payment), receive a **quotation**, accept it, then pay. Catalogue prices are labelled *indicative*; the required sourcing disclaimer appears on cards, product pages, request list, request form and policies. No authorised-partner, stock or delivery-time claims.
- **Request flow:** "Request this software" / "Check availability" buttons; request list; details form (name, email, country required; phone/company optional; address removed) → review step → submit; reference + acknowledgement; duplicate-submission protection (`client_request_id`).
- **Quotations:** versioned `quotes` + `quote_lines`; admin records supplier currency, unit cost, FX rate, fees, taxes, delivery and % or fixed margin — price calculated on the server; expiry; "price checked" and "suitable for country" confirmations; send; customer accept/decline (or admin records an offline decision); revisions supersede and require re-approval; accepted quotes never edited; expired-quote clean-up.
- **Statuses:** 16-step workflow (`src/lib/shop/workflow.ts`) with enforced transitions; Payment confirmed only by verified Paystack payment or recorded manual payment; Fulfilled only with complete fulfilment records; paid orders go to Refund pending instead of Cancelled/Unavailable.
- **Payments:** Paystack only after acceptance and only for the accepted amount; `PAYMENTS_LIVE_ENABLED` safety switch for live keys; manual payment recording (exact amount, confirmation, evidence) in `manual_payments`; payment-instructions message.
- **Fulfilment:** per-item supply evidence, licence type, region eligibility, region notes, actual fulfilment date, delivery method.
- **Notifications:** new templates for acknowledgement, quotation (and revision), order confirmation, payment instructions, payment confirmation, sourcing update, unavailable, cancellation, refund, fulfilled; optional `CONTACT_WHATSAPP` link (hidden unless set).
- **Admin:** queues (new, sourcing, quotes, payment, fulfil, refunds, payment review), next-action field, rebuilt order page, products bulk "mark unavailable/available" (purchase-enable removed), dashboard counts, CSV with accepted price/cost/margin.
- **Content:** 6 sourcing FAQs, Terms (request ≠ guarantee), Refund & Delivery Policy rewritten (accurate cancellation/refund stages, no blanket no-refund), Privacy updated.
- **Data:** migration 2 keeps all existing data and maps old statuses; tests: 44 unit, 109 shop e2e, 37 site e2e.

## 0.3.0 (2026-10-21) — online shop
- **Catalogue:** both Word documents combined into one 61-product catalogue (11 categories) stored in PostgreSQL; formula pricing (₦1,333/US$ + ₦10,000, rate checked against NFEM); document arithmetic errors corrected and flagged; 11 reference prices re-checked against official pages; Figma discrepancy flagged.
- **Images:** 61 distinct product images from official brand logos (CC0/MIT packages) + plan details; manifest in docs/.
- **Storefront:** search, categories, filters, sorting, product pages with full pricing transparency, related products, cart with persistence, checkout, order tracking, customer accounts, refund & delivery policy.
- **Payments:** Paystack initialize → verify → signed, deduplicated webhook; idempotent; failure, retry, abandonment and amount-mismatch handling; refunds via Paystack API; test/live by key.
- **Admin:** dashboard with setup status, orders, sourcing queue (supplier, cost, margin, ETA, tracking, delivery details), on-hold customer approval, refunds, CSV; product create/edit/hide/delete, image upload (stored in DB), bulk actions, purchase guardrails.
- **Infra:** migrations, auto-seed, PGlite for local dev, /api/health, Railway health check, updated legal pages, 30 unit + 108 end-to-end checks.
- Sample products removed (replaced by the real catalogue).

## 0.2.0 (2026-10-21)
- **Security:** upgraded Next.js 15.5.4 → 16.4.2 and React 19.3 (fixes published advisories); added Content-Security-Policy and HSTS; 0 production vulnerabilities.
- **Design:** full premium redesign based on the supplied mockup — hero illustration around the approved icon, trust strip, services grid, business-value section, about band, process, FAQ, CTA band, new footer; bundled Poppins/Inter fonts.
- **Pages:** new Products catalogue (category filter) + product detail pages; Portfolio now in the menu with labelled demo concepts; new Search page; About, Services (now 8, incl. Mobile App Development and Technology Consulting), Solutions, Contact, Quote, FAQ, Privacy, Terms and 404 rebuilt.
- **Backend:** inquiries stored in PostgreSQL (local file in development) with reference numbers; email notifications optional; honest failure messages.
- **Admin:** password-protected `/admin` with list, search, filters, detail, status, notes, delete, CSV export.
- **Forms:** optional phone, timeline, product reference; improved validation and accessibility.
- **SEO:** per-page canonical URLs, Open Graph image, FAQ structured data, updated sitemap/robots.
- **Docs:** new DEPLOYMENT.md, database schema, railway.json, `npm run check`, `npm run db:setup`.
- **Fixes:** removed a stray `src/app/{about,services…}` folder; official email updated to CLOUDEDGETECHNOLOGYSERVICES@GMAIL.COM (latest brief).

## 0.1.0 (2026-10-20)
Initial build: design system, all pages, inquiry API with validation and Resend email, SEO files, security headers, tests, documentation.
