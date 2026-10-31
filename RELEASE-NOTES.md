# MongoDB release — 31 October 2026

## Requested changes delivered

- Rebuilt the backend on Node.js/Express and MongoDB, including transaction-based checkout, server sessions and all persistent user/commerce/catalog records.
- Replaced the BUP logo with the exact supplied `bup_new_logo.png`; verified its file hash matches the supplied file.
- Added 466 researched Open Library cover references; retained eight existing actual covers. Other titles retain designed fallbacks. Covers can be replaced in the staff interface and are stored in GridFS.
- Added genre/category, department, availability, condition, requested-title and digital/physical filters to staff inventory, with title/price/stock/date sorting.
- Added independent used-copy inventory and discounted prices for selected titles, a Used books page, and condition selection on book pages.
- Added out-of-stock states, editable estimated dates/countdowns, per-condition restock subscriptions and notifications.
- Added registration, order-confirmation and restock email jobs with delivery tracking/retry. Real delivery requires configured SMTP.
- Included complete MongoDB Compass, local setup, image replacement and deployment instructions.

## Additional improvements

- Email verification and single-use password recovery; old sessions are revoked when passwords or account roles change.
- Server-side authorization and CSRF protection for both normal forms and uploads.
- Last-copy concurrency protection and idempotent order submission.
- Inventory revision checks so a stale staff form cannot overwrite stock changed by a recent order.
- Per-line discount allocation that reconciles exactly, including small-value rounding cases.
- Buyback eligibility tied to completed paid purchases, inspection/acceptance workflow, and unique payout references.
- Recorded refunds, inventory movements, staff audit log and CSV transaction export.
- Protected authorized PDF downloads using GridFS and current purchase entitlement checks.
- Moderated verified-purchase reviews, support replies, saved books and student notifications.
- Responsive desktop/mobile layout, accessible form labels, image-error fallbacks and print-friendly invoices.

## Validation

All 11 integration tests passed. The automated suite exercises public pages, role restrictions, multipart CSRF, registration persistence, used pricing, price tampering, duplicate checkout, concurrent last-copy orders, coupon rounding, restock notifications, course mappings, order ownership, payment/completion, buyback rates, duplicate payouts, admin pages/filters, GridFS uploads, protected/revoked PDFs, single-use password reset, session revocation and email delivery through a local SMTP capture server.

Browser checks exercised department → semester → course selection, student registration, a used-copy cart and delivery order with CAMPUS10, and filtered staff inventory. Desktop at 1440 px and mobile at 390 px were checked; no page script errors or document-width overflow were observed in those flows. A clean ZIP extraction installed successfully using `npm ci` and initialized a fresh database. The seed coverage check found 823 titles, 18 departments, 924 course entries and zero courses with fewer than two linked books.

## Configuration and limits

This is an academic project with example inventory, not an assertion of official BUP authorization. The included source is ready for installation, but no public hosting or private service accounts are created by this ZIP. Configure MongoDB, SMTP, HTTPS and your administrator before publishing. External cover availability depends on Open Library; title/author matches are not exact-edition guarantees. Curriculum sourcing and reconstructed entries are documented separately.

Cash checkout and actual receipt/refund recording are implemented. Live electronic customer payment collection is not connected; it requires merchant onboarding and gateway credentials. E-Book access works for authorized files uploaded by staff; commercial textbook PDFs are not included. Email was verified against a local SMTP receiver, not your future provider or real inbox. Docker/Atlas/production hosting instructions are supplied; the verified runtime was Windows Node.js 24 with a local MongoDB replica set, not an Atlas deployment or a Docker build.

The previous bookstore folders and ZIP have been preserved separately. This release starts a fresh MongoDB database with the supplied seed; it does not silently migrate old SQL users or passwords.
