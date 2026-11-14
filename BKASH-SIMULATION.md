# bKash classroom simulation

Updated 14 November 2026. This replaces the old Cards/Mobile banking/Net banking preview in the existing Node project. Layout follows the supplied two-page Notes PDF: branded white header, BUP merchant row, pink entry panel, Close/Confirm controls and receipt. A persistent classroom label distinguishes it from a real provider page.

## Local check

1. In VS Code open this folder, stop the old Node process with Ctrl+C, then run `npm.cmd start` (or `npm.cmd run dev`). No new packages or environment variables are needed.
2. Visit http://127.0.0.1:3000, sign in, add an in-stock book and open checkout.
3. Fill the checkout details and consent, click **Place order**, then choose **bKash** or **Cash on delivery**. Cash submits the order; bKash opens the labeled test flow.
4. Test account: `01711223344`. Verification code: `0000`. Test PIN: `123456`.
5. The receipt says **Simulation successful** and shows amount, Bangladesh time and a `SIM-BK-` reference. No SMS, charge or actual order is created. Use cash checkout separately to order.
6. Wrong values are rejected and cleared. The entered values are never sent to the server or stored. The server receives only start options, random request keys and step names. Closing cancels an active simulation when the server is reachable. Unfinished sessions expire after 15 minutes (the record remains for inspection).

## Deploy the existing service

In the current project terminal:

```powershell
git status
git add src/app.js src/db.js src/html.js src/payment-simulation.js public/js/site.js public/css/mongo.css public/assets/images/bkash-logo.png test/workflows.test.js BKASH-SIMULATION.md README.md FEATURE-STATUS.md ASSET-CREDITS.md
git commit -m "Add labeled bKash classroom simulation"
git push origin main
```

These commands assume your existing main branch. If push is rejected, fetch and inspect the branch history; do not force-push. Never add .env. No commit/push or Render deployment was performed by this update.

Render should auto-deploy if enabled. Otherwise open the existing web service and choose Manual Deploy > Deploy latest commit. Keep build `npm ci --omit=dev`, start `npm start`, existing Atlas credentials, HTTPS SITE_URL and other environment settings. No real bKash credentials are required. Wait for successful startup and verify the deployed commit. Open your actual Render URL and hard-refresh (Ctrl+Shift+R). Repeat the local check and copy the new SIM-BK reference. The actual public URL has not been supplied or verified in this change.

## Atlas and Compass

No reseed or migration is needed. Startup adds indexes for `payment_simulations` to the configured database; using the flow inserts records. Existing `orders`, `payments`, inventory, carts and buyback eligibility are unchanged by a simulation.

Atlas: open the cluster's data browser, select `bup_bookstore`, then `payment_simulations`. Refresh after completing a simulation.
Compass: connect to the same Atlas URI as the running website, refresh databases/collections, open `bup_bookstore` > `payment_simulations` > Documents. You do not upload this code to Compass or synchronize it separately.

Filter:
```json
{"provider":"bkash-classroom","simulation":true,"status":"simulated_success"}
```
Sort:
```json
{"createdAt":-1}
```
For exact verification, filter by the receipt reference:
```json
{"reference":"SIM-BK-PASTE-YOUR-REFERENCE"}
```

The same record should appear in both Atlas and Compass. Stored fields include `_id`, `key`, `userId`, `provider`, `simulation`, `status`, `stage`, `reference`, `amount`, `currency`, `delivery`, `createdAt`, `expiresAt`, and (on success) `completedAt`. Amount is paisa: 100000 means BDT 1000.00. Status is `in_progress`, `cancelled`, or `simulated_success`. An abandoned expired record can retain `in_progress` but cannot be advanced after `expiresAt`.

There is no stored account number, verification code or PIN. A simulation is not included in staff cash totals, payment CSV reports, E-Book purchase access or buybacks. If no record appears, confirm you used the new deployed version and Compass is connected to Atlas rather than the old local replica set. A successful update does not require changing an existing database password or administrator account.

## Tests

Run `npm test` ONLY with an isolated MongoDB replica-set connection: the suite clears `bup_bookstore_test`. Do not use production credentials. The new integration test covers CSRF, ownership, authoritative amount, step ordering, retry idempotency, cancellation, expiry and unchanged orders/payments/stock/cart. Existing transaction, buyback, upload and SMTP tests remain.

## Files

- `src/payment-simulation.js`: authenticated, CSRF-protected simulation routes; explicitly whitelisted record fields.
- `src/db.js`: unique per-user submission key and history index.
- `src/html.js`: reference-inspired dialog and checkout entry point.
- `public/js/site.js`: browser-only test-value checking and flow; also fixes quote recalculation to disable the actual order button.
- `public/css/mongo.css`: responsive pink/white layout.
- `public/assets/images/bkash-logo.png`: supplied logo, illustrative classroom use, not provider endorsement.

Official deployment and inspection references:
- https://render.com/docs/deploys
- https://www.mongodb.com/docs/compass/query/filter/

Validation completed: all 12 integration tests passed on the isolated local replica set at port 27029. Headless browser checks passed at mobile and desktop sizes, including all three stages, wrong-value rejection, receipt, close/Escape, no JavaScript errors and no entered credential values in network requests. No Atlas production data was changed during validation.

The green checkout panel has been removed. The small test-mode notice remains inside bKash. Public site reported by the owner: https://bup-bookstore-gq9m.onrender.com . After Render deploys the latest commit, hard-refresh and test both payment choices.
