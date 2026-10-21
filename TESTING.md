# Testing — results of 21 October 2026 (v0.2.0)

Environment: Linux, Node.js 22.22, Chromium (Playwright build 1194), PostgreSQL 18.4 (local test server).

| Check | Command / method | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | Pass |
| Lint (ESLint, Next core-web-vitals + TS rules) | `npm run lint` | Pass, 0 problems |
| Unit tests (validation, session tokens, password check, admin lock) | `npm test` | 19/19 pass |
| Production build | `npm run build` | Pass (all routes generated) |
| Dependency audit (production deps) | `npm audit --omit=dev` | 0 vulnerabilities |
| End-to-end (production server + PostgreSQL) | Playwright script, 37 checks | 37/37 pass |
| Responsive screenshots: 15 pages × 1440/768/390 px (45) | Playwright | 45/45 with no horizontal overflow and no console errors |
| Failure modes | curl | No storage & no email → 503 "NOT sent" + email shown; database down & no email → 502 "NOT sent" |
| Security headers | curl | CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy present |
| `npm run db:setup` | against PostgreSQL | Pass |

### The 37 end-to-end checks
API: GET → 405 · bad JSON → 400 · invalid fields → 422 with messages · honeypot → silently dropped · cross-origin → 403 · unknown product → 422 · valid → 200 + reference · 6th rapid request → 429 · oversized body → 413.
Forms: empty submit shows errors and focuses first field · contact submit shows success + reference · quote from product page shows product and pre-selects type · quote submit · service pre-selection.
Navigation: all 37 unique internal links on 12 pages return OK · mobile menu opens, navigates, closes, Escape closes · first Tab focuses "Skip to main content".
Admin: anonymous /admin and /admin/export blocked · forged cookie rejected · wrong password rejected · login · list · search · detail shows product and budget · status + notes saved · CSV export · delete needs confirmation · delete · sign-out re-locks.
No uncaught JavaScript errors.

## Not tested (and why)
- Real email delivery via Resend — no API key/domain available.
- Live deployment, custom domain, HTTPS — no hosting account access (Railway connector failed to connect).
- Screen-reader walkthrough and Lighthouse score — not available in this environment (semantic HTML, labels, focus states and contrast were checked manually).
- Real phones/browsers other than Chromium.

## How to re-run
`npm run check` runs typecheck, lint, unit tests and build. The browser test scripts used are described above; ask Claude to recreate them if needed (they live outside the project to keep it small).
