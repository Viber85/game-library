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
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/volume.css'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/power-menu.css'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/settings-focus.css'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/settings-special.css'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/decky-settings.css'
unzip -Z1 "$output" | grep -qx 'game-library/system-theme/settings-gamepad-focus.css'
unzip -p "$output" 'game-library/system-theme/settings-gamepad-focus.css' | grep -Fq '.BasicUI .PageListColumn :is('
unzip -p "$output" 'game-library/system-theme/settings-gamepad-focus.css' | grep -Fq 'background:#163a5e !important'
unzip -p "$output" 'game-library/system-theme/settings-gamepad-focus.css' | grep -Fq '::before'
unzip -p "$output" 'game-library/system-theme/settings-gamepad-focus.css' | grep -Fq '::after'
unzip -p "$output" 'game-library/main.py' | grep -Fq '"settings-gamepad-focus.css"'
unzip -p "$output" 'game-library/system-theme/decky-settings.css' | grep -Fq 'data-glm-decky-settings'
unzip -p "$output" 'game-library/system-theme/decky-settings.css' | grep -Fq 'html:has(.BasicUI .PageListColumn):has(.BasicUI .DialogControlsSection)'
unzip -p "$output" 'game-library/system-theme/decky-settings.css' | grep -Fq 'background:#163a5e !important'
unzip -p "$output" 'game-library/system-theme/decky-settings.css' | grep -Fq '[class*="eKmEXJCm_"]'
# Regression guard: v19/v20 unscoped rail rules affected ALL Steam Settings.
if unzip -p "$output" 'game-library/system-theme/decky-settings.css' | grep -Eq '^\.BasicUI \.Panel:has\(> \.PageListColumn\)'; then
  echo "Unscoped Decky rail rule detected; aborting package" >&2
  exit 1
fi
if unzip -p "$output" 'game-library/system-theme/decky-settings.css' | grep -Fq 'test.20 — prevent native'; then
  echo "v20 flashing focus override leaked into package" >&2
  exit 1
fi
unzip -p "$output" 'game-library/dist/index.js' | grep -Fq 'deckyLiveCssMatched'
unzip -p "$output" 'game-library/system-theme/decky-settings.css' | grep -Fq 'gamepadpagedsettings_PagedSettingsDialog_PageContent'
unzip -p "$output" 'game-library/system-theme/decky-settings.css' | grep -Fq 'gamepaddialog_Field_'
unzip -p "$output" 'game-library/dist/index.js' | grep -Fq '/decky/settings'
unzip -p "$output" 'game-library/dist/index.js' | grep -Fq 'recentDomEvidence'
unzip -p "$output" 'game-library/dist/index.js' | grep -Fq 'Read CEF diagnostics (no reload)'
unzip -p "$output" 'game-library/dist/index.js' | grep -Fq 'Copy gamepad focus transition trace'
unzip -p "$output" 'game-library/dist/index.js' | grep -Fq 'focusTrace'
unzip -p "$output" 'game-library/dist/index.js' | grep -Fq 'remainingFocusFrames=5'
unzip -p "$output" 'game-library/system-theme/decky-settings.css' | grep -Fq 'background:#163a5e !important'
# No brittle Steam route gate: the watcher identifies real painted Settings surfaces.
unzip -p "$output" 'game-library/system-theme/settings-special.css' | grep -Fq '[data-glm-settings-special-row]'
if unzip -p "$output" 'game-library/system-theme/settings-special.css' | grep -Fq '[data-glm-settings-page='; then
  echo "Special Settings cards must not depend on Steam's route URL" >&2
  exit 1
fi
unzip -p "$output" 'game-library/system-theme/settings-special.css' | grep -Fq '[role="radio"]'
# Verify the installable JS contains an immediate native row-state observer.
unzip -p "$output" 'game-library/dist/index.js' | grep -Fq 'aria-selected'
unzip -p "$output" 'game-library/dist/index.js' | grep -Fq 'data-glm-settings-special-row'
unzip -p "$output" 'game-library/system-theme/settings-special.css' | grep -Fq 'background:#163a5e !important'
unzip -p "$output" 'game-library/main.py' | grep -Fq '"settings-special.css", "settings-focus.css"'
unzip -p "$output" 'game-library/system-theme/settings-focus.css' | grep -Fq '[data-glm-settings-row]'
unzip -p "$output" 'game-library/system-theme/settings-focus.css' | grep -Fq 'box-shadow:none !important'
unzip -p "$output" 'game-library/main.py' | grep -Fq '"settings-focus.css"'
unzip -p "$output" 'game-library/system-theme/volume.css' | grep -Fq 'audio_VolumePopin_2iUUM'
unzip -p "$output" 'game-library/system-theme/power-menu.css' | grep -Fq 'gamepadcontextmenu_Focused_X813r'
unzip -p "$output" 'game-library/system-theme/power-menu.css' | grep -Fq 'BasicUIContextMenu'
unzip -p "$output" 'game-library/system-theme/power-menu.css' | grep -Fq '[role="menuitem"]'
# Power CSS must also load in main: Steam mounts its native Power popup there.
unzip -p "$output" 'game-library/main.py' | grep -Fq '"steam-input.css", "volume.css", "power-menu.css"'
unzip -p "$output" 'game-library/system-theme/power-menu.css' | grep -Fq 'box-shadow:inset 0 0 0 2px #63cfff'
# Ensure the ZIP contains THIS version's corrected native selector targets,
# not just a valid file with stale v0.4.21-test.2 CSS.
unzip -p "$output" 'game-library/system-theme/menus.css' | grep -Fq 'inset:10px 12px !important'
unzip -p "$output" 'game-library/system-theme/menus.css' | grep -Fq 'margin:12px 22px !important'
unzip -p "$output" 'game-library/system-theme/menus.css' | grep -Fq 'width:calc(100% - 44px) !important'
unzip -p "$output" 'game-library/system-theme/menus.css' | grep -Fq 'min-height:76px !important'
unzip -p "$output" 'game-library/system-theme/menus.css' | grep -Fq 'overflow:visible !important'
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
# Guard against the QAM regression that squeezed the icons and clipped Decky.
qam_css="$(unzip -p "$output" 'game-library/system-theme/qam.css')"
printf '%s\n' "$qam_css" | grep -Fq 'box-shadow:inset 0 0 0 2px #63cfff'
if printf '%s\n' "$qam_css" | grep -Eq '^[[:space:]]*(width|min-width|max-width|flex|flex-basis|height|min-height|max-height|box-sizing|margin|margin-inline|margin-block|padding|padding-inline|padding-block|overflow|position|transform)[[:space:]]*:'; then
  echo "QAM package contains layout-altering native rail/tab CSS" >&2
  exit 1
fi
unzip -Z1 "$output" | grep -qx 'game-library/dist/index.js'
unzip -Zt "$output"
