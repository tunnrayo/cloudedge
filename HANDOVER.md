# Handover — continuing this project in another Claude account

Upload the project ZIP (or the folder) and say:
> "Continue the Cloud Edge website. Read HANDOVER.md and PROJECT_STATUS.md first. Do not rebuild completed work."

## Current state
Git: branch `main`, remote `origin` = https://github.com/tunnrayo/cloudedge.git (private). Never force-push.
v0.2.0 — complete website, inquiry database, admin area, tests and docs. **Not deployed.** See PROJECT_STATUS.md for the exact list of what remains.

## Fixed facts (do not change without the owner's instruction)
Cloud Edge Technology Services Limited · RC 9922715 · Suite 306B, Samfa Plaza, Ndola Crescent, Wuse Zone 5, Abuja, FCT, Nigeria · CLOUDEDGETECHNOLOGYSERVICES@GMAIL.COM (see the email note in PROJECT_STATUS.md).
Never invent phone numbers, staff, history, clients, awards, testimonials, real projects or real products. Sample products and demo projects must stay labelled.

## Project structure
```
src/
  app/
    layout.tsx              root HTML, fonts, default SEO metadata
    globals.css             the whole design system (colours at the top)
    (site)/                 public pages; (site)/layout.tsx adds header, footer, Organization JSON-LD
      page.tsx              home
      about, services, services/[slug], solutions, products, products/[slug],
      portfolio, contact, quote, faq, privacy, terms, search
    admin/                  protected admin: login, list, inquiries/[id], export (CSV), actions.ts (server actions)
    api/inquiry/route.ts    form endpoint: validate → store → email
    sitemap.ts, robots.ts, not-found.tsx, icon.png, apple-icon.png
  components/               Header, Footer, Icon, HeroArt, InquiryForm, ui.tsx (cards, page hero, CTA, FAQ…)
  content/                  products.ts, projects.ts (catalogue data — sample/demo flags)
  lib/
    site.ts                 company facts, nav, services, solutions, FAQ, form options, settings
    catalog.ts              data access for products/projects (swap to DB/API here)
    validate.ts             shared form validation
    inquiries.ts            storage: PostgreSQL / local file; table auto-created
    email.ts                Resend notification
    auth.ts                 admin password check + signed session tokens (Web Crypto)
    admin-session.ts        requireAdmin() used by every admin page/action
    rate-limit.ts           in-memory limiter
  proxy.ts                  Next 16 "proxy" (formerly middleware): guards /admin/*
public/brand/               logo-full.png, icon-512.png, icon-source.png, og-image.png (made from the logo)
assets-original/            the supplied logo sheet and homepage mockup — never replace
scripts/                    validate.test.ts (unit tests), db-setup.mjs
docs/database/schema.sql    database table definition
railway.json                Railway build/start/healthcheck
```

## Key decisions (and why)
- **Next.js 16 + TypeScript**, one app for pages, API and admin. Upgraded from 15.5.4 because that version had published security advisories.
- **PostgreSQL** for inquiries so messages are never lost when email fails, plus a protected admin to manage them. Local file fallback keeps development simple.
- **Email optional** (Resend over plain HTTPS, no SDK).
- **Single admin password** (env vars) — simplest secure option for a small team; upgrade to per-user accounts if staff grows.
- **No external fonts/CDNs:** fonts are bundled (@fontsource), allowing a strict Content-Security-Policy.
- **Products/portfolio** use labelled sample data; `settings.showSampleProducts` / `showDemoProjects` hide them.
- Hero illustration is drawn in code around the approved icon (no new logo).

## Admin setup
Set `ADMIN_PASSWORD` (12+ chars) and `ADMIN_SESSION_SECRET` (32+ chars). Visit `/admin`. Change the password by changing the variable and redeploying; changing the secret signs everyone out.

## Commands
`npm install` · `npm run dev` · `npm run check` (typecheck+lint+tests+build) · `npm start` · `npm run db:setup`

## Tips for the next session
- Sandbox shells may lack brace expansion — create folders one by one.
- To test with a real database without Docker, the `embedded-postgres` npm package's binaries can run as a non-root user (see TESTING.md).
- Keep PROJECT_STATUS.md, CHANGELOG.md and TESTING.md updated after every change.
