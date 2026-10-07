#!/bin/sh
# Rebuilds the trimmed Bootstrap / Font Awesome / Animate.css files used by the site.
# The npm packages are installed OUTSIDE the website folder so they can never be
# uploaded by accident. Override the location with COOLFOX_TOOLS_DIR if you like.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
TOOLS="${COOLFOX_TOOLS_DIR:-$HOME/.cache/coolfox-subset-tools}"
mkdir -p "$TOOLS"
cp "$HERE/package.json" "$TOOLS/package.json"
if [ -f "$HERE/package-lock.json" ]; then
  cp "$HERE/package-lock.json" "$TOOLS/package-lock.json"
  (cd "$TOOLS" && npm ci --no-audit --no-fund --silent)
else
  (cd "$TOOLS" && npm install --no-audit --no-fund --silent)
  cp "$TOOLS/package-lock.json" "$HERE/package-lock.json"
fi
node "$HERE/build.mjs" "$TOOLS" "$@"
