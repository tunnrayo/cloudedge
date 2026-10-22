# Project Status — v0.5.0 (22 October 2026)

## What changed in v0.5.0 (platform hardening) — all implemented AND tested locally
| | Item | State |
|---|---|---|
| ✅ | Local database "ENOENT mkdir .data/pglite" bug | Fixed, regression-tested, verified on a clean start of the real app |
| ✅ | Database-backed admin sessions (revocable, 8 h / 2 h idle, rotation, cross-instance sign-in limit) | Completed & tested (forged/expired/idle/revoked cookies, logout, brute force) |
| ✅ | Append-only audit log + admin page (filters, dates, pagination, redaction) | Completed & tested |
| ✅ | Admin Health centre + JSON report; minimal public `/api/health` | Completed & tested (healthy, unhealthy DB, access control, no secrets) |
| ✅ | Admin-managed services (draft/published/inactive, order, images, preview, safe delete, one-time seed) | Completed & tested |
| ✅ | Portfolio demo concepts hidden by default (`SHOW_DEMO_PROJECTS`) with polished empty state | Completed & tested |
| ✅ | API hardening (content type, size, same-origin, 404 for missing order link, cart quote crash + rate limit) | Completed & tested |
| ✅ | Payment-safety checks (invalid signature, repeated events, wrong amount/currency, failed payment, unknown reference) | Completed & tested against the **mock** Paystack |
| ✅ | Email core (retry-safe, header-injection safe, honest statuses) | Completed & tested against a **mock** Resend |
| ✅ | Railway readiness documentation (DEPLOYMENT.md) | Written — **not deployed, nothing run on Railway** |
| ⚠️ | Privacy/Terms/Refund pages | Reviewed and unsupported claims removed; still **draft, need Nigerian legal review** |
| ⏳ | Real Paystack, real Resend, Railway deployment | NOT TESTED — need your accounts |

Branch `main`, last commit `dafe111` (v0.4.0). **v0.5.0 changes are in the working tree, not committed and not pushed** (pushing needs your approval).

---
# (v0.4.0 summary, still accurate)

**Business model now implemented: manual software sourcing reseller.** Customers browse the catalogue, send a sourcing
request (no payment), receive a quotation, accept it, and only then pay. Cloud Edge sources the product from external
suppliers after payment and records the fulfilment evidence.

## Summary table
| | Item | State |
|---|---|---|
| ✅ | Company website (all pages, design, SEO, accessibility, security headers) | Completed & tested |
| ✅ | Catalogue: 61 products, images, categories, search, filters, sorting (kept from v0.3) | Completed & tested |
| ✅ | Indicative-price labelling + required sourcing disclaimer on cards, product pages, request list, request form, policies | Completed & tested |
| ✅ | Request list → request form → review step → submit; reference number + acknowledgement; no payment at submission | Completed & tested |
| ✅ | Duplicate-submission protection (request id), unique references, server validation, unavailable products blocked | Completed & tested |
| ✅ | Admin quotation builder (supplier currency, cost, FX, fees, taxes, delivery, % or fixed margin → server-calculated price), expiry, "price checked" and "suitable for customer's country" confirmations | Completed & tested |
| ✅ | Customer accept / decline on the request page; admin can record a decision given by email/phone; revisions supersede and need re-approval; accepted quotes never edited | Completed & tested |
| ✅ | 16 order statuses with enforced transitions (Payment confirmed only by verified payment; Fulfilled only with complete fulfilment records) | Completed & tested |
| ✅ | Paystack payment only after acceptance, for the accepted amount; server verification + signed, deduplicated webhook; mismatch held for review | Completed & tested **against a mock Paystack** |
| ✅ | Manual (bank transfer) payment recording with exact-amount check and confirmation; payment-instructions message | Completed & tested |
| ✅ | Fulfilment record per item (supplier/channel, supply evidence, licence type, region eligibility, dates, delivery method, customer instructions) | Completed & tested |
| ✅ | Notifications for every step (acknowledgement, quotation, order confirmation, payment instructions, payment confirmation, updates, unavailable, cancellation, refund, fulfilled) — recorded honestly as sent / failed / not configured | Completed & tested (email provider not configured) |
| ✅ | Queues: new, sourcing, quotes, awaiting payment, to fulfil, refunds, payment review; next-action field; expiry clean-up | Completed & tested |
| ✅ | Supplier costs, supplier names, internal notes visible to admins only | Completed & tested |
| ✅ | FAQ (6 sourcing questions), Terms (request ≠ guarantee), Refund & Delivery Policy (accurate cancellations/refunds), Privacy (fewer fields) | Completed — **draft wording, needs legal review** |
| ✅ | Migration of existing v0.3 data (no reset) | Tested on a database containing v0.3 orders: all rows kept, statuses mapped |
| ⏳ | Real Paystack payments | Implemented — **awaiting your Paystack test key**; live keys additionally need `PAYMENTS_LIVE_ENABLED=true` |
| ⏳ | Customer/staff emails | Implemented — **awaiting Resend key + verified domain** |
| ⏳ | Live deployment | Ready (railway.json, health check) — **awaiting your Railway project** |

## Readiness verdict
| Capability | Ready? |
|---|---|
| Browsing the catalogue | **Yes** (once deployed) |
| Submitting sourcing requests | **Yes** (once deployed with a PostgreSQL database) |
| Creating and sending quotations | **Yes** — but customers only learn about a quotation on their request page until email (Resend) is configured, so email them manually meanwhile |
| Test payments | **Yes, after you add a Paystack `sk_test_` key** and set the webhook URL (tested here only against a mock) |
| Live payments | **No — not yet.** Needs: activated Paystack business account, live key, webhook, a full test-mode run on the deployed site, then `PAYMENTS_LIVE_ENABLED=true`. Bank-transfer payments recorded by the admin work without Paystack. |

## Known limitations
- Rate limiting for **public forms** is in memory (per server instance; resets on restart). With one Railway instance this is fine; with several, each has its own counter. Admin sign-in limits are in the database and work across instances.
- Admin sign-in limit is also per IP: behind a proxy all visitors could share one IP if the proxy does not pass `x-forwarded-for`; Railway does pass it.
- **Single administrator login** (one shared password, one role). The audit log shows *which session* acted (`admin#xxxxxxxx`), not which person. Per-staff accounts were deliberately not built; add them before giving access to several people.
- Product/service images are served publicly by their random id (`/api/images/<uuid>`); anyone who knows an id can view it. Do not upload private images.
- No password-reset email for customers yet.
- Quotations are in NGN only (supplier currency is converted with the rate the admin records).
- Expired quotations are closed when an admin presses "Close expired quotations" (customers already cannot accept an expired quote).
- No supplier API integration (none available) — sourcing is manual by design.
- Orders created before v0.4.0 that were awaiting payment were moved to "Reviewing request" (they had no quotation).

## Known errors
None found: typecheck, lint, 93 unit tests, production build, 37 + 116 + 100 end-to-end checks pass. `npm audit` (dev tools only) lists 5 high advisories in the lint tooling; production dependencies have 0.

## Next actions (owner)
0. Review the v0.5.0 changes and approve a commit/push (nothing has been pushed).
1. Create the Railway project + PostgreSQL and set variables (DEPLOYMENT.md Step 1).
2. Add the Paystack **test** key and webhook; run one full request → quote → accept → pay on the deployed site.
3. Add Resend + a verified domain so quotations and updates are emailed.
4. Decide your bank-transfer instructions text (company account) for the "Send payment instructions" box.
5. Have Privacy, Terms and Refund & Delivery policies reviewed by a lawyer.
6. Only after all of the above: live Paystack key + `PAYMENTS_LIVE_ENABLED=true`.
