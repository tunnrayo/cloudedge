# End-to-end tests

These drive a real browser against the **production build** of the site, a real PostgreSQL database and a
**mock Paystack server** (so successful, failed, underpaid and duplicate payments can be tested without real money).

| File | What it checks |
|---|---|
| `site.e2e.mjs` | 37 checks: inquiry API, forms, links, mobile menu, keyboard, inquiries admin |
| `shop.e2e.mjs` | 71 checks: admin product enabling + guardrails, search/filter/sort, images, cart persistence and totals, checkout validation, tamper attempts, Paystack success/failure/retry/mismatch, duplicate & forged webhooks, order access control, sourcing queue, on-hold approval, fulfilment, refunds, customer accounts, image upload, mobile |
| `mock-paystack.mjs` | Stand-in for `api.paystack.co` (initialize, verify, refund, fake checkout page) — tests only |

## Run (developer machine)
```
npm i --no-save playwright pg
npx playwright install chromium
node tests/e2e/mock-paystack.mjs &          # port 4010
# fresh empty database, e.g. createdb shoptest
npm run build
DATABASE_URL=postgres://USER:PASS@localhost:5432/shoptest SITE_URL=http://localhost:3100 \
PAYSTACK_SECRET_KEY=sk_test_mock_123456 PAYSTACK_BASE_URL=http://127.0.0.1:4010 \
ADMIN_PASSWORD=test-admin-password-123 ADMIN_SESSION_SECRET=0123456789abcdef0123456789abcdef-secret \
npx next start -p 3100 &
E2E_DATABASE_URL=postgres://USER:PASS@localhost:5432/shoptest node tests/e2e/site.e2e.mjs
E2E_DATABASE_URL=postgres://USER:PASS@localhost:5432/shoptest node tests/e2e/shop.e2e.mjs
```
Use a fresh database and a freshly started server for each full run (the tests create customers and orders,
and the in-memory rate limiter remembers earlier attempts for 10 minutes).
**Never** point these tests at the live database or use live Paystack keys.
