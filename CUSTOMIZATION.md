# Change pictures and content

Paths below start at the extracted `bup-bookstore` folder. Save in VS Code and refresh. Ctrl+Shift+R clears cached images.

## Book cover

**Easiest:** replace a file in `assets/images/covers/` using exactly the same filename and actual image format. For example, replace `software-engineering.jpg` with your JPG. No code change is needed.

**New filename or a book with a designed placeholder:**

1. Put your image in `assets/images/covers/`, for example `my-book.jpg`.
2. Sign in as admin → Books & eBooks → find the title (browser Ctrl+F helps) → Edit.
3. Set Cover image path to `assets/images/covers/my-book.jpg` and Save.
4. Export catalog. Copy the downloaded `curriculum.js` into the project’s `js/` folder to make the change part of the ZIP/source.

Or directly edit that book’s `image` field in **js/curriculum.js**. Example: `"image": "assets/images/covers/my-book.jpg"`. Use forward slashes and a relative path, not `C:\Users\...`. Portrait JPG/PNG/WebP around 600 × 900 pixels works well. An empty image uses a designed title-and-author cover; it is a placeholder, not the publisher's real cover.

Admin changes in browser storage override file data. To see direct file edits, remove only `bup-bookstore-catalog-v3` and the older `bup-bookstore-catalog-v2` from browser Developer Tools → Application → Local Storage, then refresh. This discards browser-only catalog edits, so export them first. Do not clear accounts/orders unless you want to reset those too.

## Homepage photograph / background

Replace **assets/images/hero-library.png** with a PNG of the same name, ideally landscape 1500 × 1000 or larger. The current picture is AI-generated and is not an actual BUP location.

For a different name or format, put the file under `assets/images/`, then search **js/app.js** for `assets/images/hero-library.png` and replace the path. Update the nearby `alt` description. Cropping is controlled by `.hero-photo > img` in `css/styles.css`, including its mobile rule. Example: `object-position: 50% 50%`.

Page background colors are in `css/styles.css` (`:root` variables and `body`). Payment/resale backgrounds are in `css/commerce.css`.

## University crest

Replace **assets/images/bup-logo.png** while keeping the name, preferably a transparent PNG. If renamed, update references in both `index.html` and `js/commerce.js`.

## Book titles, prices, stock, E-Books

Use Admin → Books & eBooks → Edit/Add, then export **curriculum.js** for portable changes. Or edit the `books` array in `js/curriculum.js`. Keep `id` stable because orders refer to it. Price is a number in BDT; stock is initial inventory before local orders. Category buttons are built automatically. ISBN and edition need verification before a real bookstore launch.

Add an authorized PDF to `assets/ebooks/` and set the E-Book path in Admin, e.g. `assets/ebooks/my-authorized-book.pdf`. Confirm permission in the checkbox. A provider HTTPS link is also accepted. Changing a path does not upload the file; put it in the project folder yourself. Public frontend links do not protect paid content.

## Department, semester and course mappings

Edit **js/curriculum.js**. Each department has `semesters`, each semester has `courses`, and each course has a stable `id`, `code`, `name`, `note`, and `bookIds`. Each department also has a flat `courses` copy used by the admin editor. Keep both course copies synchronized when changing course names or adding courses.

The storefront finds recommendations through each book’s `courses` array. Admin → Edit book → Suggested courses can change those associations. If editing by hand, use exact course IDs, keep each course’s `bookIds` synchronized, and retain at least two distinct books per course. Source provenance is in `data/curriculum-sources.json`; update it when replacing provisional data with verified batch syllabi.

## Other details

- Delivery fee/coupon: `js/data.js` → `settings`. An exported curriculum file can also include settings; update that copy if present.
- Buyback rates: `js/commerce.js` → `rates` (Like new .8, Good .75, Acceptable .7). Update visible labels if rates change.
- Hotline/footer: `index.html`. Buyback hotline text also appears in `js/commerce.js`.
- WhatsApp: `https://wa.me/8801769991123` in `index.html`; no plus sign or spaces in the link number.
- Fonts/colors/layout: the three files in `css/`.
- Admin demo seed credentials: `js/account-admin.js`. Changing them does not update an already-created browser account. A live website must never use a frontend password as real admin security.
