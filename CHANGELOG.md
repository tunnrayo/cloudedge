# Changelog

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
