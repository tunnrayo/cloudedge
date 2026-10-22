# Changelog

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
