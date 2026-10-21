# Cloud Edge Technology Services Limited — Company Website

A complete company website with working inquiry forms, a protected admin area for managing inquiries, a product catalogue and a portfolio.

**Technology:** Next.js 16 (React 19) + TypeScript, PostgreSQL for stored inquiries, optional Resend for email notifications.
**Why:** one project gives a fast, search-friendly website *and* the server code for the forms and admin — no separate backend to run.

> New here? Read this file, then **PROJECT_STATUS.md** (what works / what is missing) and **DEPLOYMENT.md** (putting it online).

---

## 1. What you need first

| Need | How to check | Where to get it |
|---|---|---|
| Node.js **20.9 or newer** (22 recommended) | Open a terminal and run `node -v` → should print `v22...` or `v20.9`+ | https://nodejs.org → download the **LTS** version |
| A code editor (optional) | — | https://code.visualstudio.com |

**Opening a terminal:** Windows → press Start, type *PowerShell*, open it. Mac → press Cmd+Space, type *Terminal*.

## 2. Run the website on your computer

1. Unzip the project somewhere easy, e.g. your Desktop. The folder is called `cloudedge-website`.
2. In the terminal, go into the folder (drag the folder onto the terminal window after typing `cd ` to paste its path):
   ```
   cd Desktop/cloudedge-website
   ```
3. Install the building blocks (takes 1–3 minutes, needs internet):
   ```
   npm install
   ```
   ✅ Success: it finishes with `added ... packages` and no line starting with `npm ERR!`. Lines saying `npm warn` are fine.
4. Create your settings file:
   - Mac/Linux: `cp .env.example .env.local`
   - Windows: `copy .env.example .env.local`
5. (Optional, to try the admin area) open `.env.local` in a text editor and fill in:
   ```
   ADMIN_PASSWORD=choose-a-long-password-here
   ADMIN_SESSION_SECRET=paste-64-random-characters-here
   ```
   Generate the secret with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
6. Start the website:
   ```
   npm run dev
   ```
   ✅ Success: it prints `Local: http://localhost:3000`. Open that address in your browser.
   - Stop it with **Ctrl + C**.
   - If port 3000 is busy: `npx next dev -p 3100` and open http://localhost:3100

On your computer, inquiries submitted through the forms are saved to `.data/inquiries.json` (no database needed) and appear at http://localhost:3000/admin.

## 3. Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server with live reload |
| `npm run build` | Production build. ✅ Success ends with a list of routes |
| `npm start` | Runs the production build (after `npm run build`) |
| `npm run typecheck` | Checks the TypeScript code for mistakes |
| `npm run lint` | Checks code quality rules |
| `npm test` | Runs the 19 unit tests (validation and admin login security) |
| `npm run check` | Runs typecheck + lint + tests + build in one go |
| `npm run db:setup` | Creates the database table (optional — the site does this automatically) |

## 4. Website pages

| Page | Address |
|---|---|
| Home | `/` |
| About (company overview, mission, vision, principles) | `/about` |
| Services + 8 service detail pages | `/services`, `/services/<name>` |
| Solutions (business problems we solve) | `/solutions` |
| Products catalogue + product pages (**sample data, clearly labelled**) | `/products`, `/products/<name>` |
| Portfolio (**demo concepts, clearly labelled**) | `/portfolio` |
| Contact (form + company details) | `/contact` |
| Request a Quote | `/quote` |
| FAQ, Privacy Policy, Terms of Use | `/faq`, `/privacy`, `/terms` |
| Site search | `/search` |
| Admin: inquiries list, detail, status, notes, delete, CSV export | `/admin` (password protected) |

## 5. Updating content (no coding experience needed — just edit text between quotes)

| To change… | Edit this file |
|---|---|
| Company details, menu, services, solutions, FAQ, form options | `src/lib/site.ts` |
| Show/hide sample products or demo projects | `settings` in `src/lib/site.ts` |
| Products (names, prices, features, photos) | `src/content/products.ts` |
| Portfolio projects | `src/content/projects.ts` |
| Mission / vision wording | `src/app/(site)/about/page.tsx` |
| Privacy Policy / Terms | `src/app/(site)/privacy/page.tsx`, `src/app/(site)/terms/page.tsx` |
| Colours and styles | `src/app/globals.css` (top of file) |

**Add a real product:** copy one product block in `src/content/products.ts`, set `sample: false`, change the details. For a photo, put the image in `public/products/` and set `image: "/products/your-photo.jpg"`. When all real products are in, set `showSampleProducts: false` in `src/lib/site.ts`.

**Add a real project:** add a block with `kind: "client"` in `src/content/projects.ts` (only with the client's approval). Set `showDemoProjects: false` to hide the demos.

**Add a service:** add one block to `services` in `src/lib/site.ts`. Its page, menu entries, sitemap entry and form option appear automatically.

After any change: run `npm run check`, then redeploy (DEPLOYMENT.md).

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| `node` or `npm` "not recognized" / "command not found" | Install Node.js LTS, then close and reopen the terminal |
| `npm install` fails with network errors | Check your internet connection and run it again |
| Page looks unstyled or old after edits | Stop the server (Ctrl+C), delete the `.next` folder, run `npm run dev` again |
| Form says "Online messages are not set up" | On the live site, set `DATABASE_URL` (and/or the Resend email variables), then redeploy |
| Admin says "locked because it is not configured" | Set `ADMIN_PASSWORD` (12+ chars) and `ADMIN_SESSION_SECRET` (32+ chars), restart |
| Admin says "Could not load inquiries" | `DATABASE_URL` is wrong or the database is stopped; check the hosting dashboard logs |
| `npm test` fails with "unknown option --experimental-strip-types" | Upgrade Node.js to version 22.6 or newer |

## 7. Project documents

README.md (this file) · PROJECT_STATUS.md · HANDOVER.md · DEPLOYMENT.md · ARCHITECTURE.md · BRAND_GUIDELINES.md · TESTING.md · CHANGELOG.md · docs/database/schema.sql · .env.example
