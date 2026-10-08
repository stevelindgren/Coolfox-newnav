# SEO status — coolfoxtrucks.com

Last updated: 2026-10-08. State as of commit `1c82924` on `main` (pushed to `origin/main`).

This file is a working note for whoever picks the SEO work up next. It is not part of the site; do not upload `docs/` to the server.

## How the site is deployed

Files are uploaded by hand over FTP to the site root. There is no automated deploy, so the repo and the live site can drift. The server is case-sensitive. To check the live site, request each file and compare it with `git show HEAD:<file>`.

## Completed (2026-10-08)

- **Audit baseline.** All 18 pages have unique titles and descriptions, correct canonical and `og:url`, one H1, alt text on every image, no broken internal links or images, and an entry in `sitemap.xml`.
- **Breadcrumb schema** on all 17 inner pages. Gallery sub-pages sit under "Vehicles" (`gallery.html`, matching the nav label) and specs sub-pages under "Specs". There are no visible breadcrumb trails on any page.
- **WebPage schema** on 14 pages carries the description and links to the site (`/#website`) and business (`/#cool-fox-trucks`) entities defined on the homepage.
- **Gallery share images.** Each of the six gallery sub-pages uses its own lead photo for `og:image` and `twitter:image`.
- **Homepage.** The declared `og:image` size now matches the real file (1155×1000). The Service offer catalog lists all six vehicle cards using their visible copy. The "24/7 support" claim was removed from the visible FAQ and the FAQ schema; no similar claim exists elsewhere.
- **Rental page.** Service schema added for van and trailer rental, with no prices. Trailer weekly rate corrected to "Weekly – $750 for 5 days".
- **Meta descriptions** trimmed on eight pages. Three remain slightly over 160 characters on purpose (`specs-gm.html` 169, `specs-mercedes.html` 167, `gallery-mb-sprinter.html` 162).
- **Specs.** Column header typo fixed in `specs-mercedes.html` (`Sprinter 170" HR`).
- **Tooling.** `scripts/apply-canonicals.mjs --check` now passes; it previously flagged every page because of a whitespace bug and a `/>` versus `>` comparison. `testwrite.txt` removed.

## Verification

- **Local:** 40 JSON-LD blocks parse and conform to the schema.org vocabulary. Every site URL in the markup resolves to a file. Titles and descriptions agree across meta, Open Graph, Twitter and schema tags. FAQ schema matches the visible questions and answers.
- **Live:** all 18 HTML pages are byte-identical to `1c82924`.
- **Google Rich Results Test** (run by Steven): homepage valid for LocalBusiness and Organization, with only the optional `priceRange` warning, which is deliberately left out. Rental page valid for Breadcrumbs, LocalBusiness and Organization. Ford gallery valid for Breadcrumbs.
- **Search Console** (checked by Steven): homepage indexed; sitemap status Success with 18 pages discovered.
- Only breadcrumbs are expected to produce a Google rich result. FAQ rich results are limited to government and health sites, and Service, OfferCatalog and WebPage have none.

## Still to do on the server

- **Upload `sitemap.xml`.** The live copy has `2026-10-07` for the homepage; the committed copy has `2026-10-08`. That is the only difference.
- **Delete 26 obsolete files.** All returned 200 on 2026-10-08. Nothing in the current HTML, CSS or JavaScript references them.
  - `gallery-ford-transit-alt.html`
  - `css/animate.css`
  - `css/bootstrap.css.bak`
  - `css/style.css.bak`
  - `js/ford-gallery-carousel.js`
  - `js/include.js`
  - `js/jquery-2.1.4.min.js`
  - `js/jquery.dlmenu.min.js`
  - `js/jquery.srcipts.min.js`
  - `icon-fonts/pi-transport/demo.html`
  - `icon-fonts/pi-transport/demo-files/demo.css`
  - `icon-fonts/pi-transport/demo-files/demo.js`
  - `img/pics/custom/Chevy/chevrolet-express-custom-01.jpg` through `-05.jpg` (five files; capital-C folder, replaced by lowercase `chevy/`)
  - `img/pics/gallery-factory/logos/brand-logo-chevrolet.svg`
  - `img/pics/gallery-factory/logos/brand-logo-mercedes.svg`
  - `img/services/KYC-logo.svg`
  - `img/whoweserve/floral-gardendelivery.jpg`
  - `img/whoweserve/groceries.jpg`
  - `img/whoweserve/icecream-frozen.jpg`
  - `img/whoweserve/pharmacy-medicaltransport.jpg`
  - `img/whoweserve/restaurants-catering.jpg`
  - `img/whoweserve/seafood-fishmarket.jpg`
- **Check by hand** (directories cannot be listed from outside):
  - anything else in `img/pics/custom/Chevy/`;
  - `.bak` or scratch files that were never in git;
  - the `scripts/` folder (`scripts/sync-nav.mjs` is live but is build tooling).
- Already gone from the server: `testwrite.txt`, `index.html.bak`, `index.html.nav.bak`, `index.php`.

## Unresolved

Waiting on business confirmation; do not change without it:

- **Build time.** The homepage FAQ and schema say most builds finish "within 4-6 weeks".
- **Service area.** The homepage Service schema says United States; the LocalBusiness entity says Long Island, New York Metro and East Coast.
- **Rental prices.** Not in the rental schema. Van rates include a per-mile charge.
- **Step 03 copy.** On the homepage "How It Works" section, "Refrigeration Install" repeats the Step 01 text and needs its own wording.

Deferred to a later pass:

- **About title.** "About Cool Fox Trucks" has no keywords.
- **Footer headings.** The `h4` column titles skip a heading level on most pages.
- **Social preview image.** `img/social-preview.jpg` is a copy of the rental van photo at 1155×1000; a purpose-made 1200×630 image is needed.
