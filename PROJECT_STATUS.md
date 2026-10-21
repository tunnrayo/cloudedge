# Project Status — v0.3.0 (21 October 2026)

## Summary table
| | Item | State |
|---|---|---|
| ✅ | Company website (all pages, design, SEO, accessibility, security headers) | Completed & tested |
| ✅ | Combined catalogue: 61 products from both Word documents, in the database | Completed & tested |
| ✅ | 61 distinct product images (official brand logos + plan details) + manifest | Completed & tested |
| ✅ | Search, category pages, filters (category, billing, price, availability), sorting | Completed & tested |
| ✅ | Product pages: price, billing, reference price, source, FX rate, check date, licence, fulfilment | Completed & tested |
| ✅ | Cart (persists across refresh), quantities, options, server-side totals | Completed & tested |
| ✅ | Checkout validation, pending orders, Paystack redirect, server verification, webhook (signed, idempotent), failed/abandoned/mismatch handling, retry | Completed & tested **against a mock Paystack** |
| ✅ | Customer order page & status tracking; guest secure link; customer accounts | Completed & tested |
| ✅ | Admin: dashboard, orders, sourcing queue (supplier, cost, margin, ETA, tracking), on-hold approval, fulfilment, refunds, CSV | Completed & tested |
| ✅ | Admin: add / edit / hide / delete products, prices, images, flags, bulk actions, guardrails | Completed & tested |
| ✅ | Local development without installing a database (PGlite) | Completed & tested |
| ⏳ | Real Paystack payments | Implemented — **awaiting your Paystack keys** (test first, then live) |
| ⏳ | Customer/staff emails | Implemented — **awaiting Resend key + verified domain** |
| ⏳ | Live deployment | Ready (railway.json, health check) — **awaiting your Railway project** |
| 🔒 | Selling the 61 products online | **Requires your confirmation of resale permission** (all unconfirmed) and re-checking 26 flagged prices |

## Products that cannot be sold online yet (and why)
- **All 61:** resale/distribution permission is not established in the documents → imported as *Available on request*.
- **26 also need price verification** (listed in docs/CATALOGUE.md): annual-commitment or annual-billed plans priced monthly (Adobe Teams ×3, Slack, Otter, Webflow, Cloudflare, Postman ×2, Docker ×2), promotional/introductory/starting prices (Parallels, Acronis, Surfshark, Namecheap, DigitalOcean, Render, Vercel), document arithmetic errors (Adobe CC Pro Plus +₦200, Bitdefender Premium +₦14, Norton Deluxe Plus I +₦179, Plus II +₦169, Premium I +₦54), Microsoft 365 Personal (source link is the Family page), Figma (official price differs: US$12–15 vs US$16), Slack & JetBrains (official page showed no price), Zoom (App Store in-app price).

## Images
Real product photos/box shots are not used: these are digital subscriptions, vendor marketing images are copyrighted and partner-licensed, and the build environment cannot download from vendor websites. Each product instead has a distinct image built from the **official brand logo** (open-licence logo packages) plus plan details; 4 brands without an available logo (Parallels, Acronis, IDrive, Otter.ai) have a clearly labelled typographic placeholder. Upload approved images any time in Admin → Products. See docs/PRODUCT_IMAGES.md.

## Known limitations
- Rate limiting is in memory (per server instance; resets on restart).
- One shared admin password (no per-staff accounts/audit trail).
- No password-reset email for customers yet (customers can email the company; guest order links always work).
- Renewals are not automated; recurring products are sold for the period shown.
- Supplier APIs: none integrated (no credentials/agreements) — fulfilment is the manual sourcing workflow.

## Known errors
None found: typecheck, lint, 30 unit tests, production build, 37 + 71 end-to-end checks, 48 responsive screenshots all pass.

## Next actions
1. Create the Railway project + PostgreSQL and set variables (DEPLOYMENT.md Step 1).
2. Add Paystack **test** key, set webhook, place a test order (Step 2).
3. Confirm resale permission and prices product-by-product; enable purchase (Step 4).
4. Resend + domain; then switch Paystack to live keys after account activation.
5. Have Privacy, Terms and Refund & Delivery policies reviewed by a lawyer.
