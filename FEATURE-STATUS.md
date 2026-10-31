# Feature status and restored payment interface

The earlier MongoDB release replaced the online-payment interface with cash-only checkout. That UI change has now been reversed: checkout includes a payment dialog with Cards, Mobile banking and Net banking tabs, provider selection, the current order total and a preview action. The preview never charges money, creates an order or marks a payment as paid. Disabled card fields show the layout without collecting card data. Return to cash checkout to place an actual order.

## Working features retained

MongoDB persistence; registration/login; student and admin accounts; course finder; catalog filters; new/used conditions; cart and cash checkout; staff receipt/refund records; orders and printable invoices; buyback inspection and payout records; wishlist; requests; support; moderated reviews; stock alerts; email queue; protected PDF upload/download; staff inventory, users, coupons and audit records. No additional feature was intentionally removed in this payment-interface correction.

## Unconnected, unprovided or limited

- Online customer payments: interface only, as requested. No live gateway, wallet debit, bank redirect, card processing or verified transaction callback. Provider names are illustrative, not integrations.
- Email: queue and SMTP sending are implemented. Gmail sender/app password configuration remains unfinished; no real inbox delivery has been verified for your account.
- E-Books: access control and uploads work, but authorized textbook PDFs must be supplied by you. An E-Book request is offered when a file is absent.
- Publication: local setup is prepared; no public hosting/domain has been deployed.
- Catalog: example prices, stock and restock dates; some cover images remain designed fallbacks. External cover matches can show different editions.
- Course lists: source limitations and reconstructed suggestions are recorded in COURSE-DATA-SOURCES.md. Not all are verified official curricula or prescribed reading lists.
- Pickup/delivery and buyback payouts: staff-managed workflows, not courier dispatch or automated bank/mobile-wallet transfers. Staff record actual receipts/payouts.
- Previous SQL records: not automatically migrated. MongoDB is initialized with the catalog seed; old SQL users/orders are not imported.
- Admin course editor edits existing course metadata; there is no full department/semester creation interface. Additional curriculum structures require a controlled data update.

The supplied logo, MongoDB Compass instructions and image replacement guide are retained. The application remains an academic project with example inventory, as previously agreed, not an officially authorized university store.

## Validation of this correction

Syntax checks passed. Browser checks verified all three payment tabs, provider selection, preview-only messaging, closing the dialog and mobile rendering, with no JavaScript errors. This patch changes the payment presentation only; the previously tested cash transaction services are unchanged.
