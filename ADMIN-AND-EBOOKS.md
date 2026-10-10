# Accounts, admin panel, and Get E-Book

## Student registration and login

1. Open the website and select **Sign in** in the header (person icon on mobile).
2. Select **Create account**. Enter a test name, student ID, department, batch, email, and password.
3. Repeat the password, then select **Create account**. Registration signs you in automatically.
4. Use **My account** to open your orders, saved shelf, or sign out.
5. On later visits, sign in using the same student ID/password on the same browser and site address.

Passwords must have at least 8 characters. Do not use a real university password. Duplicate emails and student IDs are rejected. This local prototype does not send verification email or provide password recovery. Accounts persist in this browser; the signed-in session lasts up to 8 hours in the current tab. A browser served over localhost/HTTPS, or direct-file Edge/Chrome, supports the required Web Crypto API.

Signed-in orders, requests, and support tickets are associated with that demo account. The administrator can see all this browser's records. Checkout requires a signed-in account. Old guest orders are not attached automatically to a new account. The cart and wishlist are a shared browser shelf.

## Sign in as the demo administrator

| Field | Value |
| --- | --- |
| User ID | `BUP-ADMIN` |
| Password | `BupAdmin@123` |

Select **Admin panel** in the footer, or enter these credentials on the normal sign-in page. If signed in as a student, sign out first. Student registration does not grant an administrator role.

The administrator is seeded automatically in the current browser. These credentials are intentionally public for demonstration. This is a frontend role gate, not a production access-control system.

## Admin panel sections

- **Overview:** active book titles, available copies, demo orders, demo order value, low-stock titles, and digital requests.
- **Books & eBooks:** add/edit books, prices, stock, covers, course mappings, and eBook links. Hide a title without deleting historical orders; Restore makes it visible again. Hiding removes it from the shared cart/wishlist.
- **Orders:** view contact/fulfilment details, download invoices, and update local order status. Pickup orders offer Ready for pickup; delivery orders offer Out for delivery. Completed is available for either. These updates are simulated; they do not trigger actual delivery or payment.
- **Requests:** review print and digital requests; move them through Under review, Available, and Closed.
- **Support:** move local tickets through In progress and Resolved.
- **Users:** view local account profiles and roles. Passwords are not displayed. User deletion, staff creation, and password resets are not implemented.

The **Available copies** field is the remaining inventory. The application preserves already-recorded order quantities when updating the initial stock value. Historic order prices and totals remain unchanged when catalog prices change.

## Enable an E-Book for a title

1. Obtain a PDF you are authorized to distribute, or an authorized publisher/provider link.
2. For a local PDF, copy it into the project's `assets/ebooks/` folder. Example filename: `my-book.pdf`.
3. Sign in as admin and open **Books & eBooks → Edit** for the matching book.
4. Under **Digital edition**, enter `assets/ebooks/my-book.pdf`, or the authorized HTTPS link.
5. Confirm the permission checkbox, then select **Save book**.
6. Visit the storefront → **Get E-Book → Open E-Book**. Check that the correct file opens. A PDF reader can save/download it where permitted.

Entering a file path does not create or upload a file. You must add the file yourself. HTTPS links are accepted; script, data, insecure HTTP, and traversal paths are rejected. A configured path is not a guarantee that a file exists or that a remote provider is reachable; test it before sharing.

Until a digital edition is configured, **Get E-Book** offers **Request digital edition**. A request appears in the student's requests and in Admin → Requests. Duplicate open digital requests for the same book and account are prevented. Marking a request Available does not itself create an eBook; the admin must separately configure the book's link.

No copyrighted textbook PDFs are bundled with this project. A static PDF is not protected by the demo login. Paid/restricted ebooks need server-side entitlement checks and controlled downloads before real use.

## Save admin edits into the project ZIP

Admin changes are browser-local by default. To distribute them:

1. Select **Export catalog** under Books & eBooks.
2. Replace the project's `js/curriculum.js` with the downloaded `curriculum.js`.
3. Include the actual referenced images and authorized PDFs inside the project folder.
4. ZIP the folder again.

The export includes books, departments, and settings only. It does not export customer profiles, password verifiers, sessions, or orders. To see source defaults after using the editor, remove only `bup-bookstore-catalog-v3` from browser local storage and refresh. Export changes you want to keep before resetting it.

## Buyback desk

See README.md for the complete student → staff inspection → accepted offer → simulated payout workflow. No payout control is available before receipt, inspection and student acceptance. Payout does not transfer money.
