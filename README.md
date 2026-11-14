# BUP Bookstore — MongoDB edition

A working, server-rendered university bookstore project using HTML, CSS, browser JavaScript, Node.js/Express and MongoDB. Accounts, sessions, books, carts, orders, payments, buybacks, requests, notifications, email jobs and audit records persist in MongoDB. Uploaded covers and authorized PDFs use MongoDB GridFS. No browser-local database or hard-coded admin password is used.

This is an academic project with example inventory and prices, as requested. The footer identifies it as a university project. It is not represented as an authorized university store. Configure your own database, email service and hosting before public use.

## Start in VS Code

1. Install Node.js 24 LTS, then extract this folder and open it in VS Code.
2. Follow **MONGODB-COMPASS.md** to create an Atlas database (recommended for publishing), or a local replica set. MongoDB Compass is the viewer; it does not run the database server.
3. Open the VS Code terminal in this folder. Run:

```powershell
Copy-Item .env.example .env
npm ci
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

4. Paste the generated random value into `SESSION_SECRET` in `.env`. Set `MONGODB_URI`, `MONGODB_DB`, and your SMTP settings. Keep `.env` private.
5. Run:

```powershell
npm run seed
npm run admin
npm run check
npm start
```

6. Open **http://127.0.0.1:3000**. Register a student account, or sign in using the administrator ID/password you chose in `npm run admin`. Staff workspace is `/staff`. Keep the server terminal open; Ctrl+C stops it.

The seed inserts 823 book titles, 18 departments, 924 course entries, new/used stock examples, out-of-stock examples and a CAMPUS10 coupon. Running it again preserves existing records, users, prices and stock. Each course has at least two suggested titles. See COURSE-DATA-SOURCES.md for source limitations: suggested readings and reconstructed curricula are not asserted to be faculty-approved booklists.

## Main workflows

- Students: registration, email verification, password reset, profile, search/filters, department → semester → course, wishlist, new/used selection, cart, checkout, order tracking, printable invoice, notifications, support, requests and moderated reviews.
- Checkout: **cash at campus pickup or delivery**. Orders reserve inventory atomically. Staff record actual received cash with a unique receipt reference, progress orders, and record actual refunds. No fictitious online payment success is shown. Online bKash/card processing needs a merchant account and verified gateway integration; this release does not process electronic customer payments.
- Buyback: completed paid purchases only; 80%/75%/70% of the discounted purchase amount for like-new/good/acceptable condition. Pickup or campus drop-off, staff inspection, student acceptance, then recorded actual payout. Copies cannot be sold twice. Books purchased elsewhere are referred to the campus store.
- Used books: a dedicated page and independent price/stock for each condition. Staff can add used conditions only to applicable titles.
- Restock: per-condition subscription, expected date/countdown, in-app and email notification when staff replenish stock. Dates are estimates, never an automatic promise of availability.
- Staff: genre, department, condition, stock, requested-book and E-Book filters; price/stock sorting; inventory editing, cover/PDF uploads, orders, buybacks, support, reviews, email retries and CSV transaction export.
- Admin: staff/student roles, account activation, course metadata, coupons, audit trail. Role/password changes invalidate old sessions.
- E-Books: upload a PDF you have permission to distribute. Choose registered-student or paid-purchaser access. Every download checks authorization. Uncheck permission to revoke access. No copyrighted textbook PDFs are bundled.

## Email setup

In `.env`, use the host, port, username, password and approved sender supplied by your email service. Port 587 normally uses `SMTP_SECURE=false` (STARTTLS); port 465 uses `SMTP_SECURE=true`. Use your provider's application password when required, not a normal account password. Production requires TLS. Configure the sender/domain with your provider and follow its SPF/DKIM instructions.

`npm run check` checks the SMTP connection when configured. Create a test student and order to verify delivery to an inbox you control. The running web server processes the MongoDB outbox every 15 seconds. Staff → Email delivery shows pending/sent/failed status and allows failed messages to be retried. If SMTP is absent, messages remain pending; they are **not** reported as delivered. Sent bodies are removed; sent delivery metadata expires after 30 days. A standalone `npm run email:worker` is available if you need a separate worker. Outbox claiming prevents simultaneous workers sending the same job, although a crash after SMTP acceptance can cause a retry; delivery is at least once, not an inbox guarantee.

## Change covers, logo and background

- **Book cover:** sign in as admin → Books & inventory → Files for the book → upload JPG/PNG/WebP (up to 5 MB). The processed image is stored in MongoDB, so it survives server redeployments. Staff uploads take priority over external covers.
- **New BUP logo:** already installed at `public/assets/images/bup-logo.png`. Replace that file with another transparent PNG using the same filename. Header, footer, favicon and invoice use it.
- **Homepage photograph:** replace `public/assets/images/hero-library.png`, or update the image `src` in the `home()` function in `src/html.js`. Preserve sensible dimensions and alt text.
- **Colors/layout:** `public/css/mongo.css` contains the additions to the existing styles. Browser interactions are in `public/js/site.js`; page templates are in `src/html.js`.
- **Book metadata/price/stock/course suggestions:** use the staff inventory screen. Values are stored in MongoDB, not a JavaScript catalog loaded into the browser.
- **Initial seed data:** `data/catalog.json`. `data/covers.json` records 466 researched Open Library matches. Eight existing local actual covers are retained. Remote images need Internet access and fall back to a designed title cover if unavailable. Some covers show another edition; see COVER-SOURCES.md. To apply cover references to an already seeded database, run `node scripts/import-covers.js`.

## Publishing

See DEPLOYMENT.md for Node hosting, MongoDB Atlas, HTTPS, environment variables, initial admin creation and a launch check. The ZIP contains source code and reproducible seed data; it contains no account credentials, SMTP passwords, personal database dump or installed dependencies. You must run the setup commands. Do not publish `.env` or expose MongoDB directly to the Internet.

## Verification and project layout

`npm test` uses a separate database named **bup_bookstore_test** at `MONGODB_URI`, clears its collections and runs real MongoDB transaction tests. Never store important information under that database name. Use a dedicated test connection rather than production credentials. The local SMTP test sends only to a temporary local capture server.

`src/`: server, validation, sessions/security, transaction services, email outbox and templates. `scripts/`: setup/admin/check commands. `public/`: CSS, images and browser JavaScript. `data/`: seed catalog and cover provenance. `test/`: integration tests. `compose.yaml`: optional local database only. `Dockerfile`: deployment image for the Node app.

See RELEASE-NOTES.md for new features, validation evidence and operational limits.

## Restored payment interface

Checkout now includes Cards, Mobile banking and Net banking preview tabs, following the supplied reference. Use “Explore online payment options” at checkout. Electronic payments are intentionally nonfunctional; cash checkout remains available. See FEATURE-STATUS.md for the complete limitations list.

## bKash classroom simulation update

The older multi-provider preview has been replaced by the labeled bKash classroom flow described in BKASH-SIMULATION.md. It uses browser-only fixed test values and stores separate payment_simulations receipts. It does not charge money, create an order or change paid purchase access. The earlier descriptions of Cards/Mobile banking/Net banking tabs describe the previous interface.
