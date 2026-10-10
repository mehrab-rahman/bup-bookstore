# Backend connection points

This delivery intentionally excludes a database and backend. It is a complete demonstration of the requested frontend flows. It must not process real money or serve as production authentication as delivered.

## Connect a real service

1. Replace browser-local accounts/session checks in `js/account-admin.js` with authenticated server sessions, server-side roles and password reset/verification. Remove the public demo admin credentials.
2. Persist catalog, users, carts, orders, order items, requests, tickets and buybacks in a shared database. Validate all input and permissions on the server. Commit stock and order changes atomically; use idempotency keys.
3. Replace `openPayment` in `js/commerce.js` with an approved payment provider’s hosted checkout flow. The server calculates totals and validates signed webhooks. Never accept a browser success button as payment confirmation. Card number/CVC/PIN/OTP must stay with the provider. Current provider names are interface examples, not integrations or endorsements.
4. Secure E-Books through licenses, entitlement checks and authorized download links. No textbook files are supplied here.
5. Persist buyback inspection notes, ownership and remaining eligible quantities. Gate actual payout on staff approval and student acceptance; verify payment settlement before marking paid. Record refunds, return handling and audit history on the server.
6. Confirm BUP branding permission, official catalog/pricing, syllabus versions, buyback condition policy, delivery service, hotline staffing and privacy/retention rules before launch.

## Demonstration storage

- `bup-bookstore-v1`: cart, saved shelf, orders, requests, support, buybacks.
- `bup-bookstore-accounts-v2`: salted password verifiers and student demo profiles.
- `bup-bookstore-session-v2`: current-tab session, expires after eight hours.
- `bup-bookstore-catalog-v3`: admin-edited catalog. Old v2 catalogs are merged with expanded defaults when no v3 catalog is present.

Browser storage is neither a database nor a security boundary. Different browsers/devices do not share records; clearing site data deletes them. Simultaneous tab edits are not synchronized or transaction-safe. Old guest orders are kept but are not automatically assigned to a newly registered student.

## Data caveats

COURSE-DATA-SOURCES.md records source differences. Management semester placements are provisional. Public pages can include parallel curriculum versions and elective/language alternatives. Suggestions for labs, viva and projects are supporting references. Confirm prescribed books, legal/tax editions, ISBNs and actual inventory before selling. Designed cover placeholders are deliberately used where a matching licensed cover is absent.
