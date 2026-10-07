# Rebuilding the trimmed Bootstrap and Font Awesome files

The site loads cut-down copies of Bootstrap, Font Awesome and Animate.css from
its own server instead of the full CDN versions. Those copies only contain what
the pages use, so they must be rebuilt when that changes.

**This folder is build tooling. Do not upload `scripts/` to the web server.**

## When to rebuild

- You add a Font Awesome icon the site has not used before. Until you rebuild,
  it shows as an empty box.
- You use a Bootstrap class or component that was not used before (for example
  a dropdown, an accordion or a new utility class). Until you rebuild, it has
  no styling.
- You add a new page.

## How

You need Node.js 18 or newer. From the website folder:

```sh
sh scripts/subsets/build.sh           # rebuild the files
sh scripts/subsets/build.sh --check   # only report whether anything would change
```

The first run downloads the tools (pinned in `package.json` and
`package-lock.json`) to `~/.cache/coolfox-subset-tools`, outside the website
folder, so nothing extra ends up in the folder you upload. Set
`COOLFOX_TOOLS_DIR` to use a different location.

## What it writes

| File | What it is |
|---|---|
| `css/bootstrap-5.3.2.subset.css` | Bootstrap rules the site uses |
| `css/fontawesome-6.5.1.subset.css` | Font Awesome rules for the icons in use |
| `css/animate-4.1.1.subset.css` | Animate.css rules used on the About page |
| `fonts/fa-*.subset.woff2` | Icon fonts reduced to the icons in use |
| `js/bootstrap-5.3.2.bundle.min.js` | Unmodified Bootstrap JavaScript |
| `fonts/README.txt`, `licenses/*` | Font notes and licence texts |

`fonts/inter-*.woff2` and `licenses/inter-OFL.txt` are not generated; they are
the Inter font files from Google Fonts and their licence.

## After a rebuild

1. Check the pages in a browser, especially any new icon or component.
2. The file names do not change, and the server caches CSS, JS and fonts for a
   year. Add or bump a `?v=` value on the changed file's `<link>`/`<script>`
   tag in the pages (for example `css/fontawesome-6.5.1.subset.css?v=2`). For a
   changed icon font, bump the `?v=` on the Font Awesome stylesheet and add the
   same `?v=` to the font URLs inside it.
3. Upload the changed files and the pages.

## How unused rules are detected

The script reads every `*.html` page, `partials/*.html` and the site's own
`js/*.js` and keeps any rule whose class names appear there. Classes that only
exist while the page is in use are listed in `build.mjs` (`bootstrapSafelist`):
open and closing modals and their backdrop, collapsing panels, off-canvas
panels, and the `active` / `disabled` / `show` state classes. Hover, focus and
active styles are kept automatically with their base rule. If you add a script
that sets a new Bootstrap class at runtime, add it to that list.

## Licences

- Bootstrap: MIT. The licence banner stays at the top of the CSS and JS files.
- Font Awesome Free: icons CC BY 4.0, fonts SIL OFL 1.1, code MIT. The banner
  stays at the top of the CSS. "Font Awesome" is a Reserved Font Name under the
  OFL, so the reduced font files are renamed "Subset Icons" internally; their
  copyright record is unchanged.
- Animate.css: MIT (version 4.1.1). The banner stays at the top of the CSS.
- Inter: SIL OFL 1.1, served unmodified.

Full texts are in `licenses/`.
