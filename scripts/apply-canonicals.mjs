/**
 * Apply canonical link tags across the project.
 *
 * Requirements satisfied:
 * - Recursively scans for `.html` files.
 * - Inserts OR replaces canonical tags inside `<head>`.
 * - Ensures exactly one: `<link rel="canonical" href="...">`
 * - Places the canonical line directly below the `<title>` line.
 * - Does NOT reformat/reserialize HTML: we only remove existing canonical tags
 *   and insert the single canonical line; everything else stays byte-for-byte
 *   identical.
 * - Does NOT touch non-HTML files.
 *
 * Usage:
 *   node scripts/apply-canonicals.mjs          # writes changes
 *   node scripts/apply-canonicals.mjs --dry   # prints what would change
 *   node scripts/apply-canonicals.mjs --check # exits 1 if changes are needed
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const siteBase = "https://coolfoxtrucks.com";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry") || args.has("--dry-run");
const checkOnly = args.has("--check");

const IGNORE_DIRS = new Set([".git", "node_modules"]);

function toPosixPath(p) {
  // path.relative() returns platform-specific separators; canonicals should use forward slashes.
  return p.split(path.sep).join("/");
}

function canonicalHrefForRelPath(relPosix) {
  // Homepage: https://coolfoxtrucks.com/
  if (relPosix === "index.html") return `${siteBase}/`;
  // All other pages keep the `.html` filename and reflect directory structure.
  return `${siteBase}/${encodeURI(relPosix)}`;
}

function countCanonicalTags(headInner) {
  const re = /<link\b[^>]*\brel\s*=\s*(["'])canonical\1[^>]*>/gi;
  return (headInner.match(re) || []).length;
}

function updateHtmlCanonicals(html, canonicalHref, relPosixForLogs) {
  const headOpenRe = /<head\b[^>]*>/i;
  const headCloseRe = /<\/head>/i;
  const titleRe = /<title\b[^>]*>[\s\S]*?<\/title>/i;

  const headOpen = headOpenRe.exec(html);
  if (!headOpen) {
    return { changed: false, html, warning: `SKIP (no <head>): ${relPosixForLogs}` };
  }

  const headOpenEnd = headOpen.index + headOpen[0].length;
  const headCloseOffset = html.slice(headOpenEnd).search(headCloseRe);
  if (headCloseOffset === -1) {
    return { changed: false, html, warning: `SKIP (no </head>): ${relPosixForLogs}` };
  }

  const headCloseStart = headOpenEnd + headCloseOffset;
  const headInner = html.slice(headOpenEnd, headCloseStart);

  // Remove existing canonical tags in <head>.
  //
  // 1) Remove entire lines that are only a canonical <link> (preserves original newline bytes).
  // 2) Remove any remaining canonical <link> tags that appear inline (rare, but keeps safety).
  const canonicalLineRe =
    /^[\t ]*<link\b[^>]*\brel\s*=\s*(["'])canonical\1[^>]*>\s*(?:\r\n|\n)?/gim;
  const canonicalTagRe = /<link\b[^>]*\brel\s*=\s*(["'])canonical\1[^>]*>/gim;

  let newHeadInner = headInner.replace(canonicalLineRe, "");
  newHeadInner = newHeadInner.replace(canonicalTagRe, "");

  const titleMatch = titleRe.exec(newHeadInner);
  if (!titleMatch) {
    return { changed: false, html, warning: `SKIP (no <title>): ${relPosixForLogs}` };
  }

  // Determine the indentation from the line that contains the <title> open tag.
  const titleLineStart = newHeadInner.lastIndexOf("\n", titleMatch.index) + 1;
  const beforeTitle = newHeadInner.slice(titleLineStart, titleMatch.index);
  const indent = (beforeTitle.match(/^[\t ]*/) || [""])[0];

  const canonicalLine = `${indent}<link rel="canonical" href="${canonicalHref}">`;

  // Insert canonical directly below the title line.
  const titleEnd = titleMatch.index + titleMatch[0].length;
  const nextLfIdx = newHeadInner.indexOf("\n", titleEnd);

  let insertAt = titleEnd;
  let insertText = "";

  if (nextLfIdx !== -1) {
    const newlineSeq = newHeadInner[nextLfIdx - 1] === "\r" ? "\r\n" : "\n";
    insertAt = nextLfIdx + 1; // after the newline sequence
    insertText = `${canonicalLine}${newlineSeq}`;
  } else {
    // No newline after </title> inside <head>; create one without altering other content.
    const detectedNl = (newHeadInner.match(/\r\n|\n/) || ["\n"])[0];
    insertAt = titleEnd;
    insertText = `${detectedNl}${canonicalLine}${detectedNl}`;
  }

  newHeadInner = newHeadInner.slice(0, insertAt) + insertText + newHeadInner.slice(insertAt);

  // Safety: enforce exactly one canonical inside <head>.
  const canonicalCount = countCanonicalTags(newHeadInner);
  if (canonicalCount !== 1) {
    return {
      changed: false,
      html,
      warning: `SKIP (unexpected canonical count=${canonicalCount} after update): ${relPosixForLogs}`,
    };
  }

  const newHtml = html.slice(0, headOpenEnd) + newHeadInner + html.slice(headCloseStart);
  return { changed: newHtml !== html, html: newHtml, warning: null };
}

async function* walkHtmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      yield* walkHtmlFiles(fullPath);
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name.toLowerCase().endsWith(".html")) yield fullPath;
  }
}

async function main() {
  const root = process.cwd();
  let changedFiles = 0;
  let totalFiles = 0;
  const warnings = [];
  const wouldChange = [];

  for await (const filePath of walkHtmlFiles(root)) {
    totalFiles += 1;
    const relPosix = toPosixPath(path.relative(root, filePath));
    const canonicalHref = canonicalHrefForRelPath(relPosix);

    const original = await fs.readFile(filePath, "utf8");
    const result = updateHtmlCanonicals(original, canonicalHref, relPosix);
    if (result.warning) warnings.push(result.warning);

    if (result.changed) {
      changedFiles += 1;
      wouldChange.push(relPosix);
      if (!dryRun && !checkOnly) {
        await fs.writeFile(filePath, result.html, "utf8");
      }
    }
  }

  if (warnings.length) {
    // Keep warnings visible but non-fatal; these need manual attention.
    for (const w of warnings) console.warn(w);
  }

  if (dryRun) {
    console.log(`[dry-run] ${changedFiles}/${totalFiles} HTML files would be updated.`);
    for (const p of wouldChange) console.log(`- ${p}`);
    return;
  }

  if (checkOnly) {
    if (changedFiles > 0) {
      console.error(`${changedFiles}/${totalFiles} HTML files need canonical updates.`);
      process.exitCode = 1;
    } else {
      console.log(`OK: ${totalFiles} HTML files already have correct canonicals.`);
    }
    return;
  }

  console.log(`Updated canonicals in ${changedFiles}/${totalFiles} HTML files.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

