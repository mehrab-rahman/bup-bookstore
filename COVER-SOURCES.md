# Actual book-cover research

The catalog's original eight cover files are retained. Additional matches use the Open Library Search API to match the catalog title and primary author to an indexed work that has a cover ID. Book title similarity must be at least 0.88 and primary-author similarity at least 0.64, with a matching surname and corroborating name tokens. Results identified as workbooks, summaries, test banks, study guides or instructor material are rejected unless the catalog specifically requests that material.

The selected cover is artwork for a matching title and author; **edition, printing and regional cover design can differ**. Most additional catalog entries were supplied as "Reference edition" without an ISBN, so these matches are not exact-edition guarantees. Preserve the edition note on detail pages and allow staff to upload a more specific cover.

## Source and display

- Search API documentation: https://openlibrary.org/dev/docs/api/search
- Cover API and display guidance: https://openlibrary.org/dev/docs/api/covers
- Each manifest entry contains its own Open Library source page, cover URL, matched title/authors and confidence values.
- Open Library asks public websites to reference `covers.openlibrary.org` directly, rather than bulk-download the cover API. The application should use `remoteCover` and retain a local generated fallback if the remote image cannot load.
- Include a courtesy Open Library attribution link, preferably on each book detail page and in the credits/about page.
- The cover art remains the property of its respective rights holders; the metadata match does not transfer rights or assert an official university endorsement.

## Included provenance

`data/covers.json` includes 466 matched cover references and source evidence. The original eight local cover files are retained. The seed imports these references for new books. Run `node scripts/import-covers.js` to update an existing catalog while preserving staff-uploaded covers. Research utilities and search caches are not needed to run the website and are not included in the release.
