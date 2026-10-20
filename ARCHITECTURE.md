# Architecture
- Next.js 15 App Router, React 19, TypeScript strict. Pages are static; `/quote` and `/api/inquiry` are dynamic.
- Content lives in `src/lib/site.ts`; presentation in components/pages.
- Inquiry flow: client validates (`validate.ts`) > POST `/api/inquiry` > server re-validates > honeypot field `website` drops bots > in-memory rate limit (5 per 10 min per IP) > Resend REST API email. Failures return honest errors; HTML in messages is escaped.
- No database: nothing is stored on the server. Consequence: if email fails, the inquiry is lost (visitor is told). Add a database (e.g. Postgres) plus protected admin only if inquiry history is needed.
- Security: security headers in `next.config.mjs`, secrets only via env vars, `/api/` disallowed in robots.
- Future: products/projects arrays, optional analytics, CRM.
