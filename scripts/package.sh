#!/usr/bin/env bash
# Decky Loader expects one game-library/ directory inside the install ZIP.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run typecheck
npm run build

if [[ ! -s dist/index.js ]]; then
  echo "Missing dist/index.js after build" >&2
  exit 1
fi

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

dest="$stage/game-library"
mkdir -p "$dest/dist"
cp plugin.json main.py updates.py hltb.py protondb.py system_status.py package.json README.md "$dest/"
cp -R system-theme "$dest/system-theme"
cp dist/index.js "$dest/dist/index.js"

# Add source files for auditability without deploying node_modules.
mkdir -p "$dest/source"
cp -R src "$dest/source/src"

output="$PWD/game-library-v$(node -p 'JSON.parse(require("fs").readFileSync("package.json","utf8")).version').zip"
rm -f "$output"
(cd "$stage" && zip -qr "$output" game-library)
echo "Created: $output"
unzip -Z1 "$output" | grep -qx 'game-library/plugin.json'
unzip -Z1 "$output" | grep -qx 'game-library/main.py'
unzip -Z1 "$output" | grep -qx 'game-library/updates.py'
unzip -Z1 "$output" | grep -qx 'game-library/hltb.py'
unzip -Z1 "$output" | grep -qx 'game-library/protondb.py'
unzip -Z1 "$output" | grep -qx 'game-library/system_status.py'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/shared.css'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/qam.css'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/settings.css'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/game-details.css'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/settings-extras.css'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/game-details-extras.css'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/running-menu.css'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/steam-input.css'
# Ensure the ZIP contains THIS version's corrected native selector targets,
# not just a valid file with stale v0.4.21-test.2 CSS.
unzip -p "$output" 'game-library/system-theme/menus.css' | grep -Fq 'inset:4px 8px !important'
# Native Steam row must be transparent; only its inset ::before has blue fill.
unzip -p "$output" 'game-library/system-theme/menus.css' | grep -Fq 'isolation:isolate !important'
unzip -p "$output" 'game-library/system-theme/menus.css' | grep -Fq 'z-index:-1 !important'
unzip -p "$output" 'game-library/system-theme/menus.css' | grep -Fq 'background:transparent !important'
# Ensure native Steam menu has the stronger glow of our own sidebar.
unzip -p "$output" 'game-library/system-theme/menus.css' | grep -Fq 'box-shadow:0 0 20px rgba(3,157,255,.72),'
# Guard against shipping the extra outer Steam menu focus ring again.
if [[ "$(unzip -p "$output" 'game-library/system-theme/menus.css')" == *'box-shadow:inset 0 0 0 2px #63cfff,'* ]]; then
  echo "Duplicate outer Steam menu focus ring found in packaged CSS" >&2
  exit 1
fi
unzip -p "$output" 'game-library/system-theme/qam.css' | grep -Fq 'quickaccessmenu_TabContentColumn_2z5NL'
unzip -p "$output" 'game-library/system-theme/qam.css' | grep -Fq 'box-shadow:inset 0 0 0 2px #63cfff'
unzip -Z1 "$output" | grep -qx 'game-library/dist/index.js'
unzip -Zt "$output"
