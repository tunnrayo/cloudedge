# Testing — results of 22 October 2026 (v0.5.0)

Environment: Linux, Node.js 22.22, Chromium (Playwright build 1194), PostgreSQL 18.4, mock Paystack (tests/e2e/mock-paystack.mjs), mock Resend (tests/e2e/mock-resend.mjs). Each end-to-end suite ran against a fresh database and a freshly started production server.

| Check | Result |
|---|---|
| `npx tsc --noEmit` (typecheck) | PASS |
| `npm run lint` | PASS (0 errors, 0 warnings) |
| `npm test` — unit tests | PASS 93/93 (adds `scripts/platform.test.ts`: local DB folder regression incl. real PGlite open/restart, migrations, sessions, sign-in limit, audit, health, services, portfolio, request guard, email) |
| `npm run build` | PASS |
| `npm audit --omit=dev` (what ships) | PASS — 0 vulnerabilities |
| `npm audit` (incl. dev tools) | WARNING — 5 *high* advisories, all in the lint tooling chain (`eslint-config-next` → `braces`); not shipped to the live site; the only offered fix is a breaking downgrade, so it was not applied |
| tests/e2e/site.e2e.mjs | PASS 37/37 |
| tests/e2e/shop.e2e.mjs | PASS 116/116 (incl. new payment-safety checks: wrong currency, failed attempt, `charge.failed`, success for a failed transaction, malformed signed body, missing signature, unknown reference) |
| tests/e2e/platform.e2e.mjs | PASS 100/100 |
| Responsive/console sweep (dev server, 390/768/1280 px, 90 page loads incl. 8 admin pages ×3 widths, 384 images) | PASS — no horizontal overflow, no broken images, no console errors, no dead internal links on real routes (a mistyped category slug in the sweep script correctly returned 404) |
| Clean start of the real app with no `.data` folder and no `DATABASE_URL` | PASS — `/api/health` ok, `.data/pglite` created, migrations applied |
| Secret scan of the project files | PASS — no real keys or passwords; only obviously fake fixtures inside the redaction tests |

## What the platform suite proves (examples)
Forged, guessed, injected, expired, idle and revoked cookies are all refused; a copied cookie stops working the moment the administrator signs out; after 5 wrong passwords even the right password is refused; the audit table cannot be updated or deleted even by direct SQL; hostile text in an audit row is shown as text; the Health page and JSON never contain the password, session secret, API keys or database URL; an unreachable database gives 503 on `/api/health`, marketing pages still render and admin sign-in refuses; production without `DATABASE_URL` does not silently use a local database; a draft service is 404 publicly but previewable; a published service's address cannot be changed even with a tampered form; services customers enquired about cannot be deleted; restarting/second instance never duplicates services or overwrites edits; provider email failures never lose the inquiry and are never reported as sent; header injection is neutralised.

## NOT tested (needs your accounts or other tools)
Real Paystack test/live keys and webhook delivery from Paystack's servers · real email delivery through Resend · Railway deployment, custom domain, HTTPS, backups · screen-reader walkthrough and Lighthouse · browsers other than Chromium · load/performance testing · penetration testing. **Live payments have not been tested and must not be assumed to work.**
