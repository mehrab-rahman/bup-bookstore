# Verification — 10 October 2026

Automated browser checks passed in Microsoft Edge using Playwright against the local HTTP website. Desktop home, course, payment, buyback and admin screenshots were inspected; mobile layouts were checked at 390 × 844. No browser JavaScript errors were recorded.

## Verified in this version

- 18 departments, 144 semester groups, 924 source-listed course/version entries, including the exact 70 ICT/ICE PDF entries.
- Every course maps to at least two distinct book records. 823 catalog records are included (editions/author variants can repeat titles).
- Department/semester/course cascade and clearing dependent selections; ICT semester 6 Software and Requirement Engineering results.
- Home limited to eight cards; catalog displays 24 then loads another 24.
- Registration with student ID, email, name, department, batch and password; subsequent student-ID login and administrator login.
- Simulated payment decline preserves stock/cart and creates no order; invalid test card is rejected; successful test payment clears cart and saves one order. No card number is stored.
- Cancellation preserves the cart. Net banking provider selection, delivery fee and invoice payment status agree.
- Pay-on-receipt orders remain unpaid until staff record a simulated cash receipt; unpaid orders cannot be resold.
- Completed purchase eligibility, buyback estimate after coupon, duplicate-copy prevention, receipt, inspection, student acceptance, and single demo payout recording.
- Pickup requests and cancellation releasing eligible copies.
- Catalog search in the admin panel and exported curriculum.js parses with all 18 departments.
- Mobile home, courses, catalog, account and buyback pages have no document overflow; hotline and WhatsApp remain visible.

## Boundaries

These are frontend demonstrations using browser storage. Real gateway settlement, bank redirects, staff pickup, payout, database concurrency, server authorization, protected E-Books and official curriculum approval are not tested or implemented. Management semester mappings and flagged source alternatives require department/batch confirmation. Test data used by browser QA is not shipped in the ZIP.
