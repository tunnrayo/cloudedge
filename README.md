# Cloud Edge Technology Services Limited: Website

Next.js 15 (App Router) + TypeScript. Chosen because it gives a fast, SEO-friendly site and a built-in server route for the inquiry forms, with no separate backend and no database.

## Prerequisites
Node.js 20 or newer (check: `node -v`). Download from https://nodejs.org (LTS).

## Run locally
1. Open a terminal and go to this folder: `cd cloudedge`
2. Install: `npm install` (success: ends without "ERR!")
3. Copy settings: `cp .env.example .env.local` (Windows: `copy .env.example .env.local`)
4. Start: `npm run dev` then open http://localhost:3000
   - If port 3000 is busy: `npx next dev -p 3100`

## Commands
| Command | Purpose |
|---|---|
| `npm run dev` | development server |
| `npm run build` | production build (success lists all routes) |
| `npm start` | run the production build |
| `npm run typecheck` | TypeScript check |
| `npm test` | validation unit tests (needs Node 22+) |

## Forms and email
Forms work fully only after email is configured (see `.env.example`). Without it, the site honestly tells visitors their message was NOT sent and shows the official email. Setup: create a free account at https://resend.com, verify your domain, create an API key, set `RESEND_API_KEY`, `INQUIRY_FROM_EMAIL`, optionally `INQUIRY_TO_EMAIL`.

## Deploy (Vercel, free tier available)
1. Put the project on GitHub (`.env.local` is git-ignored; never commit secrets).
2. At https://vercel.com import the repository; framework is detected automatically.
3. Add the environment variables from `.env.example` under Settings > Environment Variables, set `NEXT_PUBLIC_SITE_URL` to your real address, then redeploy.
4. Domain: Vercel > Domains > add your domain and follow the DNS records shown. A domain costs money (yearly); hosting and Resend have free tiers with limits.
Railway also works (`npm run build` / `npm start`).

## Updating content
- Company facts, services, FAQs, form options: `src/lib/site.ts`
- Products: `products` array in `src/app/solutions/page.tsx`
- Projects: `projects` array in `src/app/portfolio/page.tsx` (page exists but is deliberately not in the menu until real projects are approved)
- Add a service: add one object to `services` in `site.ts`; its page, sitemap entry and quote option appear automatically (add a mapping line in `src/app/quote/page.tsx` for the dropdown preselect).

## Troubleshooting
- `command not found: npm`: install Node.js. 
- Blank styles or errors after edits: stop the server (Ctrl+C), delete `.next`, run again.
- Form says "not configured": add the Resend variables and restart.
