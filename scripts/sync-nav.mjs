import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const templatePath = resolve(root, "partials", "site-nav.html");
const template = readFileSync(templatePath, "utf8").trimEnd() + "\n";

const files = [
  "about.html",
  "aquaculture-grants.html",
  "contact.html",
  "gallery-chevy.html",
  "gallery-custom.html",
  "gallery-ford-transit-alt.html",
  "gallery-ford-transit.html",
  "gallery-gmc.html",
  "gallery-mb-sprinter.html",
  "gallery-ram-promaster.html",
  "gallery.html",
  "index.html",
  "rental.html",
  "services.html",
  "specs-ford.html",
  "specs-gm.html",
  "specs-mercedes.html",
  "specs-ram.html",
  "specs.html"
];

const blockPattern = /<!-- NAVIGATION -->[\s\S]*?<!--End Navigation -->/;

for (const file of files) {
  const path = resolve(root, file);
  const source = readFileSync(path, "utf8");

  if (!blockPattern.test(source)) {
    throw new Error(`Navigation markers not found in ${file}`);
  }

  const next = source.replace(blockPattern, template.trimEnd());

  if (next !== source) {
    writeFileSync(path, next + "\n");
  }
}
