# BUP Bookstore — Complete Frontend

Responsive HTML, CSS and vanilla JavaScript. No database, build step, npm installation or framework required. Accounts, orders, stock changes and buybacks are saved in this browser. This is a demonstration frontend, not a live university service.

## Open in VS Code

1. Extract the ZIP (Extract All).
2. VS Code → File → Open Folder → choose `bup-bookstore`.
3. Open `index.html` with VS Code Live Server or another local preview server.
4. Alternatively, if Python is installed, run `python -m http.server 5500 --bind 127.0.0.1` in this folder, then open http://127.0.0.1:5500.
5. Stop a Python preview with Ctrl+C. Use the same address/port to retain browser records. Direct file opening works in supporting browsers, but localhost is recommended for accounts and consistent storage.

## Accounts

Register with email, student ID, name, department, batch and password. Sign in using the **student ID as User ID**, not email. Use sample personal information and a test password. Passwords are salted PBKDF2 verifiers; browser authentication remains a demo, not secure server access control.

**Admin User ID: `BUP-ADMIN`**  
**Admin password: `BupAdmin@123`**

## Included features

- Department → semester → course discovery for all 18 requested departments and eight semesters, with at least two suggested books per listed course.
- ICT follows the supplied ICE semester-topics PDF. Other lists use BUP program pages. Curriculum versions/electives are retained with notes; Management semester placements are provisional. See COURSE-DATA-SOURCES.md.
- Search, categories, sorting, stock filters, book details, saved shelf and a paginated catalog.
- Cart, coupon `CAMPUS10`, free campus pickup and sample BDT 60 campus delivery.
- Sign-in required checkout; Bangladesh-style Cards / Mobile banking / Net banking / Pay on receipt interface, simulated success, decline and cancellation. No money is transferred.
- Local orders, admin fulfilment updates, stock reduction and downloadable printable invoices.
- Get E-Book on every book. Authorized PDF links can be configured; otherwise students can request the digital edition. No commercial textbook PDFs are bundled.
- Buybacks of completed account purchases: 80% like new, 75% good, 70% acceptable. Pickup or campus drop-off, staff inspection, student offer acceptance, then staff demo payout recording.
- Admin catalog editing, authorized E-Book configuration, orders, requests, support tickets, account list and Buyback desk.
- Hotline +8801769991123 (Md Shumon), 9am–7pm Bangladesh time, telephone link and WhatsApp link.

## Payment test

Choose a provider and simulate success or decline. For Cards use **4242 4242 4242 4242**, **12/99**, CVC **123**, and a test name. Real card numbers are rejected. Card fields are never saved. Only method, simulated status and a test reference go into the order. No PIN or OTP is requested. Pay on receipt creates an unpaid record. Closing/cancelling preserves the cart.

## Try the full buyback journey

1. Register a student and buy a book through the demo checkout.
2. Sign out, sign in as admin, open Orders and set that purchase to Completed. For pay-on-receipt orders, also use Record cash received (demo).
3. Sign back in as the student → Sell books → Start a buyback. Choose a condition and pickup or drop-off.
4. Admin → Buyback desk → Mark received → Inspect & make offer.
5. Student → Sell books → Accept the offer (or decline).
6. Admin → Buyback desk → Record demo payout. A reference is required. No actual money is paid.

Buyback estimates use the paid book price after coupon discounts, excluding delivery, rounded to two decimals. Copies already reserved/sold cannot be sold again; cancelled or rejected requests release them. Unknown, hidden, or externally purchased books are directed to the campus store. Severely damaged books can be rejected during inspection. The frontend does not automatically relist inspected books as new inventory.

## Change the website

Read CUSTOMIZATION.md for pictures, books and course data, and ADMIN-AND-EBOOKS.md for admin editing. Export catalog downloads `curriculum.js`; replace the file in `js/` to share edits with another browser.

| File | Purpose |
| --- | --- |
| index.html | Header, navigation, footer, hotline, WhatsApp |
| js/data.js | Initial settings: delivery fee and coupon |
| js/curriculum.js | Active full catalog, departments, semesters, courses and mappings |
| js/app.js | Storefront, cart, checkout details, orders, invoices |
| js/account-admin.js | Accounts and staff panel |
| js/commerce.js | Payment interface and buybacks |
| css/styles.css | Main theme and responsive styles |
| css/account-admin.css | Account and admin styles |
| css/commerce.css | Course finder, payments and buybacks |
| assets/images/ | Logo, hero image and cover images |
| assets/ebooks/ | Your authorized PDF files |
| data/curriculum-sources.json | Course/book provenance and notes |

No backend, live gateway, real payment, email delivery or shared database is included. PRODUCTION-NOTES.md explains connection points. Local storage can be inspected or modified by anyone with browser access; use test data only.
