# Project Status — v0.2.0 (21 October 2026)

## Works (verified by tests — see TESTING.md)
- **All pages:** Home, About, Services (+8 detail pages), Solutions, Products (+8 product pages), Portfolio, Contact, Request a Quote, FAQ, Privacy, Terms, Search, 404. Responsive at 390px (phone), 768px (tablet) and 1440px (desktop) with no horizontal scrolling.
- **Design:** premium navy/electric-blue/cyan design based on the supplied homepage mockup, using the approved logo and icon only.
- **Inquiry forms:** client + server validation, clear error messages, loading/success/failure states, reference number (e.g. CE-7K3P9Q), honeypot spam trap, rate limiting, cross-site request blocking.
- **Inquiry storage:** PostgreSQL when `DATABASE_URL` is set (tested against PostgreSQL 18); local file `.data/inquiries.json` during development.
- **Admin area `/admin`:** password login (signed http-only cookie, 8 h), inquiry list with search/status filter/pagination, detail view, status + internal notes, delete with confirmation, CSV export, sign-out. Locked when not configured.
- **Email notifications:** code complete (Resend). Not live-tested — no credentials.
- **Products & portfolio:** reusable cards/catalogue with category filter; all current items are **clearly labelled samples/demo concepts**; data layer ready for a database/API later (`src/lib/catalog.ts`).
- **SEO/accessibility/security:** page titles & descriptions, Open Graph image, sitemap, robots, JSON-LD (Organization + FAQ, confirmed facts only), skip link, keyboard focus, reduced-motion, security headers incl. CSP and HSTS.
- Typecheck, lint, 19 unit tests, production build, 37 end-to-end checks: all pass.

## Needs you (external)
1. **Hosting + database** — not deployed. Follow DEPLOYMENT.md (Railway recommended). The Railway connection in Claude failed to connect during this session, so deployment could not be done from here.
2. **Admin password + secret** — set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` on the host.
3. **Email (optional)** — Resend account + verified domain + API key.
4. **Domain name** — buy and connect (DEPLOYMENT.md step 4).
5. **Content approvals:** mission/vision/principles (About), service list, FAQ, Privacy Policy and Terms (draft — need legal review incl. NDPA 2023; retention period to confirm), sample products → replace with real products/prices, demo concepts → replace with approved client projects.
6. **Brand:** a dark-background (white text) logo version and official colour codes were not supplied; footer uses the full logo on a white panel.
7. **Social media links** — none supplied; add to `social` in `src/lib/site.ts`.

## Email address note
Two spellings were supplied in different briefs: CLOUDEDGETECHSERVICES@GMAIL.COM (original project instructions) and **CLOUDEDGETECHNOLOGYSERVICES@GMAIL.COM** (latest brief, project description and the homepage mockup). The website uses the latest one. Change `company.email` in `src/lib/site.ts` if that is wrong.

## Known limitations
- Rate limiting is in memory: it resets on restart and isn't shared across multiple server instances (fine for one Railway instance).
- `NEXT_PUBLIC_SITE_URL` is built into the pages: redeploy after changing it.
- Single shared admin password (no individual staff accounts or audit log).
- No analytics (none requested; privacy policy says so).

## Known errors
None found in build, lint, typecheck, tests or browser checks.

## Next action
Deploy on Railway with PostgreSQL (DEPLOYMENT.md), send a test inquiry, then review the draft wording with the company.
