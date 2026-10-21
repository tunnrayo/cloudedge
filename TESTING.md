# Testing — results of 21 October 2026 (v0.3.0)

Environment: Linux, Node.js 22.22, Chromium (Playwright build 1194), PostgreSQL 18.4, mock Paystack API (tests/e2e/mock-paystack.mjs).

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass (0 problems) |
| `npm test` — 30 unit tests (pricing formula, catalogue integrity, document-price differences flagged, webhook signature, checkout & inquiry validation, admin sessions) | 30/30 |
| `npm run build` (clean) | Pass |
| `npm audit --omit=dev` | 0 vulnerabilities |
| tests/e2e/site.e2e.mjs (company site, inquiries, admin) | 37/37 |
| tests/e2e/shop.e2e.mjs (full customer + admin journey) | 71/71 |
| Responsive: 16 pages × 1440/768/390 px | 48/48 no horizontal overflow, no console errors |
| Local development path (no DATABASE_URL → PGlite) | Migrations + 61-product import + pages OK |
| `npm run db:setup` on an empty PostgreSQL database | Pass |
| Product images | 61 files, 61 distinct (SHA-256), 0 broken references |
| Server log during e2e | 0 errors |

### Shop journey covered (71 checks)
Admin enabling products and guardrails (blocked when price unverified / resale unconfirmed; bulk skip) · search, category, billing, availability filters, sort by price · distinct/unbroken images · product page price, billing, reference & FX · enquiry-only products show request button · add to cart, quantities, cart count, persistence after refresh, totals, remove · checkout validation · browser-supplied prices ignored · enquiry product rejected · quantity clamp · cross-site POST blocked · redirect to Paystack · pending order with server total · redirect before payment does not pay · confirmed payment, cart cleared, order paid · duplicate webhook ignored, paid exactly once, forged signature rejected · failed payment, retry with new reference, webhook-only confirmation · underpaid "success" → payment review · unknown reference · order page access control (no token / wrong token) · anonymous admin & CSV blocked · sourcing queue, supplier/cost/date saved, margin · fulfil blocked until delivered · on-hold message, customer approval · delivery details shown to customer · partial & full refunds, over-refund blocked · registration (weak password rejected, scrypt hash), pre-filled checkout, account order history, owner access, sign-out, wrong password · image upload (fake rejected, PNG stored & served) · product request form · mobile cart.

## Not tested (requires your accounts)
Real Paystack test/live keys and webhook delivery from Paystack's servers · real email delivery (Resend) · Railway deployment, custom domain, HTTPS · screen-reader walkthrough and Lighthouse · browsers other than Chromium.
