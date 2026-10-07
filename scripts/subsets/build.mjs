/**
 * Rebuild the trimmed vendor files the site loads instead of the full CDN copies:
 *
 *   css/bootstrap-5.3.2.subset.css      Bootstrap rules the site actually uses
 *   css/fontawesome-6.5.1.subset.css    Font Awesome rules for the icons in use
 *   css/animate-4.1.1.subset.css        Animate.css rules used on about.html
 *   fonts/fa-*.subset.woff2             Icon fonts cut down to those icons
 *   js/bootstrap-5.3.2.bundle.min.js    Unmodified copy of Bootstrap's JS bundle
 *   licenses/*                          Licence texts for the above
 *
 * Run it through build.sh (see README.md). It scans every *.html page, the nav
 * partial, the site's own JavaScript and (for icons) the site's CSS, so run it
 * again whenever you add a new icon, a new Bootstrap class or a new page.
 */
import { createRequire } from "node:module";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = process.argv[2];
if (!toolsDir) {
  console.error("Run this through build.sh (it installs the tools and passes their location).");
  process.exit(1);
}
const checkOnly = process.argv.includes("--check");
const require = createRequire(path.join(toolsDir, "package.json"));
const { PurgeCSS } = require("purgecss");
const subsetFont = require("subset-font");
const fontverter = require("fontverter");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const pkg = (name, ...rest) => path.join(toolsDir, "node_modules", name, ...rest);
const site = (...rest) => path.join(root, ...rest);

// Files that are searched for class names.
const htmlAndJs = [site("*.html"), site("partials/*.html"), site("js/!(bootstrap-)*.js")];
const siteCss = [site("css/style.css"), site("css/nav.css"), site("css/icons.css"), site("css/type.css")];

/**
 * Classes that never appear in the HTML source because Bootstrap's JavaScript
 * (or our own scripts) adds them while the page is in use: open/closing modals,
 * the modal backdrop, collapsing panels, off-canvas panels, and the generic
 * state classes. Hover/focus/active/disabled *pseudo-classes* are kept
 * automatically whenever their base rule is kept.
 */
const bootstrapSafelist = {
  standard: [
    /^modal/, /^fade$/, /^show$/, /^showing$/, /^hiding$/,
    /^collaps/, /^offcanvas/, /^btn-close/, /^visually-hidden/,
    /^active$/, /^disabled$/, /^focus$/, /^was-validated$/,
    // Layout families used across the pages; kept whole so a new column or
    // table variant works without a rebuild.
    /^table/, /^navbar/, /^nav-/, /^container/, /^row$/, /^col/, /^g[xy]?-/,
  ],
  greedy: [/data-bs-/, /modal-open/],
};

const fontAwesomeSafelist = {
  standard: [/^fa$/, /^fas$/, /^far$/, /^fab$/, /^fa-solid$/, /^fa-regular$/, /^fa-brands$/, /^fa-classic$/],
};

const outputs = new Map(); // relative path -> Buffer|string
const put = (rel, data) => outputs.set(rel, data);
const note = (banner, line) => banner.replace(/\*\//, `* ${line}\n */`);

/**
 * Font Awesome Free's fonts are under the SIL Open Font License with the
 * Reserved Font Name "Font Awesome": a modified copy (a subset is one) must not
 * keep that name as its font name. This renames the family inside the subset
 * font files to "Subset Icons". The copyright and version records are left
 * untouched, and the CSS still refers to the fonts by its own family label.
 */
async function renameReservedFontName(woff2) {
  const sfnt = Buffer.from(await fontverter.convert(woff2, "sfnt"));
  const numTables = sfnt.readUInt16BE(4);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    tables.push({ rec, tag: sfnt.toString("latin1", rec, rec + 4), offset: sfnt.readUInt32BE(rec + 8), length: sfnt.readUInt32BE(rec + 12) });
  }
  const name = tables.find((t) => t.tag === "name");
  const head = tables.find((t) => t.tag === "head");
  const count = sfnt.readUInt16BE(name.offset + 2);
  const strings = name.offset + sfnt.readUInt16BE(name.offset + 4);
  const swaps = [["Font Awesome", "Subset Icons"], ["FontAwesome", "SubsetIcons"]]; // same lengths
  const nameIds = new Set([1, 3, 4, 6, 16, 17, 18, 21, 22]); // family / full / PostScript names only
  let renamed = 0;
  for (let i = 0; i < count; i++) {
    const r = name.offset + 6 + i * 12;
    if (!nameIds.has(sfnt.readUInt16BE(r + 6))) continue;
    const start = strings + sfnt.readUInt16BE(r + 10);
    const end = start + sfnt.readUInt16BE(r + 8);
    for (const [from, to] of swaps) {
      for (const enc of ["utf16le", "latin1"]) {
        const needle = Buffer.from(from, enc);
        const patch = Buffer.from(to, enc);
        if (enc === "utf16le") { needle.swap16(); patch.swap16(); } // name strings are UTF-16BE
        let at = start;
        while ((at = sfnt.indexOf(needle, at)) !== -1 && at + needle.length <= end) {
          patch.copy(sfnt, at);
          at += needle.length;
          renamed += 1;
        }
      }
    }
  }
  if (!renamed) throw new Error("Font name records not found; the font layout may have changed.");
  // Recompute the checksums that cover the bytes we changed.
  const sum = (from, length) => {
    let total = 0;
    for (let i = 0; i < Math.ceil(length / 4) * 4; i += 4) {
      let word = 0;
      for (let b = 0; b < 4; b++) word = word * 256 + (from + i + b < sfnt.length && i + b < Math.ceil(length / 4) * 4 ? sfnt[from + i + b] : 0);
      total = (total + word) >>> 0;
    }
    return total;
  };
  sfnt.writeUInt32BE(sum(name.offset, name.length), name.rec + 4);
  sfnt.writeUInt32BE(0, head.offset + 8);
  sfnt.writeUInt32BE(sum(head.offset, head.length), head.rec + 4);
  sfnt.writeUInt32BE((0xb1b0afba - sum(0, sfnt.length)) >>> 0, head.offset + 8);
  return Buffer.from(await fontverter.convert(sfnt, "woff2"));
}

async function buildBootstrap() {
  const [res] = await new PurgeCSS().purge({
    content: htmlAndJs,
    css: [pkg("bootstrap", "dist", "css", "bootstrap.min.css")],
    safelist: bootstrapSafelist,
  });
  let css = res.css.replace(/\/\*# sourceMappingURL=.*?\*\/\s*$/, "");
  css = note(css, "Subset: only the rules this site uses. Rebuild with scripts/subsets/build.sh.");
  put("css/bootstrap-5.3.2.subset.css", css);
  put("js/bootstrap-5.3.2.bundle.min.js", (await fs.readFile(pkg("bootstrap", "dist", "js", "bootstrap.bundle.min.js"), "utf8")).replace(/\n?\/\/# sourceMappingURL=.*\s*$/, "\n"));
  put("licenses/bootstrap-LICENSE.txt", await fs.readFile(pkg("bootstrap", "LICENSE")));
}

async function buildFontAwesome() {
  const fa = (...rest) => pkg("@fortawesome", "fontawesome-free", ...rest);
  const [res] = await new PurgeCSS().purge({
    content: [...htmlAndJs, ...siteCss],
    css: [fa("css", "all.min.css")],
    safelist: fontAwesomeSafelist,
    fontFace: false,
    keyframes: true,
    variables: false,
  });
  let css = res.css;

  // Every icon rule that survived tells us which glyphs the fonts must contain.
  const codepoints = new Set([...css.matchAll(/content:"\\([0-9a-f]+)"/g)].map((m) => m[1]));
  const text = [...codepoints].map((c) => String.fromCodePoint(parseInt(c, 16))).join("");

  const fonts = { "fa-solid-900": "", "fa-regular-400": "", "fa-brands-400": "" };
  for (const name of Object.keys(fonts)) {
    const original = await fs.readFile(fa("webfonts", `${name}.woff2`));
    const subset = await subsetFont(original, text, { targetFormat: "woff2" });
    put(`fonts/${name}.subset.woff2`, await renameReservedFontName(subset));
  }

  // Keep only the three Font Awesome 6 faces and point them at the subset fonts.
  for (const face of css.match(/@font-face\{[^}]*\}/g) || []) {
    if (!face.includes("Font Awesome 6")) {
      css = css.replace(face, "");
      continue;
    }
    const file = face.includes("Brands") ? "fa-brands-400" : face.includes("font-weight:400") ? "fa-regular-400" : "fa-solid-900";
    css = css.replace(face, face.replace(/src:[^;}]*/, `src:url(../fonts/${file}.subset.woff2) format("woff2")`));
  }
  css = note(css, "Subset: only the icons this site uses; the fonts are subset to match.\n * Rebuild with scripts/subsets/build.sh after adding a new icon.");
  put("css/fontawesome-6.5.1.subset.css", css);
  put("licenses/fontawesome-free-LICENSE.txt", await fs.readFile(fa("LICENSE.txt")));
  put("fonts/README.txt", [
    "Fonts used by this site",
    "",
    "inter-latin.woff2, inter-latin-ext.woff2",
    "  Inter, unmodified, as served by Google Fonts. SIL Open Font License 1.1.",
    "  Licence: ../licenses/inter-OFL.txt",
    "",
    "fa-solid-900.subset.woff2, fa-regular-400.subset.woff2, fa-brands-400.subset.woff2",
    "  Modified versions of the Font Awesome Free 6.5.1 fonts (Copyright Fonticons, Inc.,",
    "  SIL Open Font License 1.1): reduced to the icons this site uses and renamed",
    "  \"Subset Icons\" internally, because \"Font Awesome\" is a Reserved Font Name.",
    "  Licence: ../licenses/fontawesome-free-LICENSE.txt",
    "",
  ].join("\n"));
  return codepoints.size;
}

async function buildAnimate() {
  const [res] = await new PurgeCSS().purge({
    content: [site("about.html")],
    css: [pkg("animate.css", "animate.min.css")],
    keyframes: true,
    variables: false,
  });
  put("css/animate-4.1.1.subset.css", note(res.css, "Subset: only the animations this site uses. Rebuild with scripts/subsets/build.sh."));
  put("licenses/animate.css-LICENSE.txt", await fs.readFile(pkg("animate.css", "LICENSE")));
}

await buildBootstrap();
const iconCount = await buildFontAwesome();
await buildAnimate();

let changed = 0;
for (const [rel, data] of outputs) {
  const file = site(rel);
  const next = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
  let prev = null;
  try { prev = await fs.readFile(file); } catch {}
  const same = prev && prev.equals(next);
  if (!same) changed += 1;
  console.log(`${same ? "unchanged" : checkOnly ? "WOULD CHANGE" : "written  "}  ${rel}  (${next.length} bytes)`);
  if (!same && !checkOnly) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, next);
  }
}
console.log(`\n${iconCount} Font Awesome icons in use. ${changed} file(s) ${checkOnly ? "would change" : "changed"}.`);
if (changed && !checkOnly) {
  console.log("A changed CSS/JS file keeps its name, so bump its ?v= value in the pages (or rename it) before uploading.");
}
if (checkOnly && changed) process.exitCode = 1;
