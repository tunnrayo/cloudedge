# Deployment Guide — putting the website online

The website is **ready to deploy but not yet deployed.** Nothing below has been done on your behalf: it needs your own accounts. Prices were checked on 21 October 2026 and can change — always confirm on the provider's pricing page.

## What you need

| Item | Needed? | Cost (Oct 2026) |
|---|---|---|
| GitHub account (stores the code) | Yes | Free — https://github.com |
| Hosting for the website + database | Yes | **Railway (recommended):** one-time US$5 trial credit, then Hobby plan US$5/month which includes US$5 of usage. A small site like this usually stays close to that; check the Usage page after a week. |
| A domain name, e.g. `cloudedge.com.ng` or `cloudedgetech.com` | Recommended | Paid yearly to a domain registrar (`.ng` / `.com.ng` through a NiRA-accredited registrar) |
| Resend account (email notifications) | Optional | Free plan: 100 emails/day, 3,000/month, up to 3 domains |

**Why Railway?** It runs the website *and* the PostgreSQL database in one place, and the project already contains `railway.json`. Vercel's free Hobby plan is for **personal, non-commercial use only**, so a company website there needs Vercel Pro (US$20 per user/month) plus a separate database (e.g. Neon) — see Option B.

---

## Step 1 — Put the code on GitHub (one time)

Your repository: **https://github.com/tunnrayo/cloudedge** (private), branch `main`.

**Easiest:** link GitHub to Claude (claude.ai → Settings → Connectors → GitHub, or the "connect GitHub" prompt in a Claude Code session), give it access to `tunnrayo/cloudedge`, then ask Claude: *"Push the Cloud Edge project to https://github.com/tunnrayo/cloudedge on main."*

**Or push it yourself from your computer:**
1. Install Git from https://git-scm.com (Windows: accept the defaults). Check with `git --version`.
2. Unzip the project and open a terminal inside the `cloudedge-website` folder (it already contains the Git history and the remote address).
3. Run:
   ```
   git remote -v
   git push -u origin main
   ```
   The first line should show `https://github.com/tunnrayo/cloudedge.git`. A browser window asks you to sign in to GitHub the first time.
   ✅ Success: the last lines say `main -> main` and the GitHub page shows the files.
4. If the push is **rejected** ("fetch first" / "non-fast-forward"), GitHub already has a file such as a README. Do **not** force-push. Run:
   ```
   git pull origin main --allow-unrelated-histories --no-rebase
   ```
   If it reports a conflict in `README.md`, open the file, keep the Cloud Edge text, delete the lines starting with `<<<<<<<`, `=======` and `>>>>>>>`, then run `git add README.md` and `git commit -m "Merge GitHub README"`. Then run `git push -u origin main` again.

`.env.local` is never uploaded (it is in `.gitignore`), which is correct.

## Step 2 — Option A: Railway (recommended)

1. Go to https://railway.com, click **Login** → **Login with GitHub**.
2. Click **New Project** → **Deploy from GitHub repo** → choose `cloudedge-website`. Railway starts building; it may fail the first time because settings are missing — that is expected.
3. Add the database: in the project, click **+ Create** (or **New**) → **Database** → **PostgreSQL**. Wait until it shows as running.
4. Click your **website service** (not the database) → **Variables** tab → add these one by one (**New Variable**):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Type `${{Postgres.DATABASE_URL}}` — Railway links it to the database automatically (use the database service's exact name if it isn't "Postgres") |
   | `ADMIN_PASSWORD` | A long password only you know (12+ characters) |
   | `ADMIN_SESSION_SECRET` | 64 random characters. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `NEXT_PUBLIC_SITE_URL` | Your website address, e.g. `https://cloudedge-website-production.up.railway.app` (from step 5) or later your own domain. No trailing slash. |

5. Website service → **Settings** → **Networking** → **Generate Domain**. Copy the address it gives you and put it in `NEXT_PUBLIC_SITE_URL` (step 4).
6. Click **Deploy** (or it redeploys automatically after variable changes). Open **Deployments** → latest → **View logs**.
   ✅ Success: the build log ends with the list of routes and the deploy log shows `Ready`.
7. Test the live site:
   - Open the address. Check Home, Services, Contact.
   - Send a test message from **Contact**. You should see "Thank you — your message has been received" with a reference like `CE-7K3P9Q`.
   - Open `/admin`, sign in with `ADMIN_PASSWORD`, and confirm your test message is listed. Delete it afterwards.

> If something fails, open the deployment logs; the error usually names the missing variable. Common causes: `DATABASE_URL` not linked to the database, or a typo in a variable name.

## Step 3 — Email notifications (optional, recommended)

Inquiries are always stored in the database and visible in `/admin`. Email adds an instant notification to the company inbox.

1. Sign up at https://resend.com (free).
2. **Domains** → **Add Domain** → enter your domain → add the DNS records Resend shows at your domain registrar → wait until **Verified**. (Without your own domain you can only send test emails to your own Resend login address using `onboarding@resend.dev`.)
3. **API Keys** → **Create API Key** (permission: Sending access). Copy it — it is shown once.
4. In Railway → website service → **Variables**, add:
   - `RESEND_API_KEY` = the key
   - `INQUIRY_FROM_EMAIL` = `Cloud Edge Website <noreply@YOURDOMAIN>`
   - `INQUIRY_TO_EMAIL` = where to receive inquiries (leave empty to use CLOUDEDGETECHNOLOGYSERVICES@GMAIL.COM)
5. Redeploy, send a test inquiry and check the inbox (and spam folder). In `/admin` the inquiry shows **Email notification: Sent**.

## Step 4 — Connect your own domain

1. Buy the domain from a registrar.
2. Railway → website service → **Settings** → **Networking** → **Custom Domain** → enter e.g. `www.yourdomain.com`.
3. Railway shows a DNS record (usually a **CNAME**). Add it in your registrar's DNS settings exactly as shown.
4. Wait for Railway to show the domain as active (minutes to a few hours). HTTPS is set up automatically.
5. Change `NEXT_PUBLIC_SITE_URL` to `https://www.yourdomain.com` and redeploy (the address is built into the pages, so a redeploy is required).

## Option B: Vercel + Neon (alternative)

1. Database: create a free project at https://neon.tech and copy its connection string (it contains `sslmode=require`).
2. https://vercel.com → **Add New Project** → import the GitHub repository.
3. Add the variables from the Railway table, using the Neon connection string as `DATABASE_URL`.
4. Deploy. Note: a company website requires Vercel **Pro** under Vercel's fair-use rules. The rate limiter is per server instance, which is weaker on Vercel's serverless platform.

## Updating the live site later

Edit files → run `npm run check` → then:
```
git add -A
git commit -m "Describe your change"
git push
```
Railway (and Vercel) redeploy automatically after each push.

## Backups

Railway → Postgres service → **Backups** lets you create backups (availability depends on plan). You can also download all inquiries at any time from `/admin` → **Export CSV**.
