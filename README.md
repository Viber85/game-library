# Game Library — SteamOS Decky plugin

Independent SteamOS Game Mode dashboard, developed using the **Viber85 Claw Metrics / Better Overlay** Decky build conventions. **Not** a PS5 Dashboard fork.

## Features in 0.2 development previews

- **Optional Steam Home replacement (enabled by default):** intercept Steam's /library/home route after Decky loads, so Game Library is used when entering Game Mode. Disable in Quick Access to restore native Home; the default preference persists across reboots.
- **Animated focus-expand sidebar (v0.4.0):** the icon-only rail expands from 76 px to 218 px when controller or keyboard focus enters it. Inline labels fade in, and the right dashboard moves with the flex layout (no overlay). D-pad Up/Down retains the expanded rail; D-pad Right/B returns to the last selected game and collapses the rail. The responsive narrow layout uses 66 px / 204 px, honors reduced-motion preferences, and leaves Steam's own sidebar/QAM untouched.
- **Alphabetical by default:** All library tabs and View More start in A–Z order. Users can switch to Recent using the existing sort pill.
- **Correct Play / Install state:** only games marked as installed show Play. Uninstalled Steam games and Unifideck/non-Steam shortcuts show Install, which opens the game's native Steam/Unifideck details for its proper install workflow. The plugin never attempts to launch an uninstalled shortcut.
- **View More:** Each library tab initially displays just 15 portrait cards followed by a View More tile. The tile opens a scrollable full-library grid, with matching art/selection styling, controller navigation and B to return. The grid renders 60 items at a time and extends as the user browses. Navigation uses the actual rendered CSS columns: D-pad Left enters the permanent sidebar only from the first card in a row; pressing Right or B on the sidebar returns to the exact previously focused grid card. Up/Down follows visual rows without random skipping. A future batch keeps the pending focus until mounted.
- Explicit D-pad Up/Down movement on the rail, Right/B back to the games.
- D-pad Up from the game row accesses the top library tabs; Left/Right navigates them. L1/R1 cycles tabs directly from the game row, tab strip and left rail.
- Read-only TabMaster integration: active Steam user's tabs, order and hidden tab visibility are read from TabMaster settings.
- Supports exact local evaluation of common TabMaster filters (collection, installed, platform, regex, whitelist, blacklist and merge). Other filters show a **native Steam Library fallback** rather than incorrect game results.
- SteamOS game metadata now uses `collectionStore.GetCollection(...).allApps` with additional overview fallbacks.
- **Unifideck + TabMaster:** Epic/GOG tabs resolve their actual `[Unifideck] Epic` and `[Unifideck] GOG` Steam collection membership. If Unifideck recreates a collection, the plugin resolves the new ID by the saved collection name instead of silently showing the wrong library.
- Hero artwork respects Steam user-selected hero images (including custom SteamGridDB art) and tries jpg/png, local cached, native Steam and store fallbacks in order. If the game has no hero, a cover is used when available. The hero now stretches behind the entire Home viewport, including the top tabs and game carousel, while preserving a left-to-right dark fade behind game details. The full-grid view remains clean and unmodified.
- **Steam game title logos** show directly above the game's name, using the same native/custom artwork data as the hero.
- **ProtonDB status in the same row as Installed/Non-Steam.** Steam titles are rated by AppID; Epic/GOG shortcuts are resolved by their game TITLE against the Steam catalog with strict similarity checks, and then rated using that game's ProtonDB community summary. Unmatched/ambiguous titles never show invented scores. Results and title matches are locally cached.
- **HowLongToBeat** Story, Extras and 100% duration cards beside Steam playtime. The card now uses a compact horizontal three-column layout (fixed specificity conflict with Steam metric styles). Direct on-demand requests to howlongtobeat.com, with 7-day disk cache, name validation, and graceful offline handling. HLTB has no official public API and availability is not guaranteed.
- The native SteamOS status bar owns the top of the screen: the duplicate internal header is hidden and the dashboard is inset below it; the featured art panel has no outlined card border.
- Colors have been tuned toward the deep-navy and cyan UI concept.
- Integrated GitHub Releases checker, notes, confirmation and Decky-managed installer (in Quick Access).

## Built-in Midnight theme (default, no CSS Loader)

**Game Library Midnight is the default system-wide Game Mode theme** when
this Decky plugin starts. No second plugin, separate theme installation or
CSS Loader activation is required.

The plugin uses Decky's own `injectCssIntoTab` / `removeCssFromTab` APIs.
It loads its bundled style sheets for Steam's main Game Mode browser and its
separate Quick Access / Steam Menu windows, and re-checks them as menus open.
The exact same navy and cyan tokens as our dashboard apply to:

- **Steam Menu / sidebar** — dark panels, cyan active items and focus
- **QAM / Decky panels** — dark-blue sections and focused tabs
- **Settings** — navy surfaces, blue settings rows and controls
- **Downloads** — matching cards, buttons, graphs and focus states
- **Header, footer, dialog buttons and context menus** — shared palette

Colors: background `#020815`, card `#0C1B32`, focus `#4AC1FF`.
All existing Steam controls, layouts and controller navigation remain intact.

**To use:** install the newest Game Library ZIP. Midnight activates
automatically as soon as Decky loads it, including after returning from
Desktop Mode or rebooting the handheld.

**To revert:** Game Library → Appearance → turn **Midnight — Default Theme**
off. This immediately removes the styles managed by our plugin and saves the
setting for subsequent restarts. Turn it on again to restore the theme.

The internal theme registry currently has **Midnight** and **Off**; future
color variants can be added without changing the Game Library dashboard or
requiring an external theming plugin.

If the previously released CSS Loader version of Game Library Midnight
is enabled on the device, disable that old CSS Loader copy once to avoid
two copies of the same style competing. It is **not** needed for the new
integrated theme.

**v0.2.0-test.16:** expands Midnight coverage on native Steam game detail
pages and Settings. The original Settings implementation targeted a generic
`.PageListColumn` class that SteamOS doesn't use; the new stylesheet matches
`gamepadpagedsettings_PagedSettingsDialog_*`, including unfocused controls,
category navigation and dropdowns. A new `game-details.css` covers play
controls, game metadata, activity feeds and subnavigation while preserving
Steam game artwork. Steam can minify CSS classes, so the plugin also resolves
classes using Decky's live Steam webpack class map and re-injects the theme
only when the real class mapping changes. A versioned CSS marker removes
older, incomplete themes left behind by hot reload.

**v0.4.1 — expanded Midnight coverage:** new bundled CSS reaches more
Steam Game Mode controls than v0.4.0, including the System/Internet Settings
rows, Internet/Wi-Fi network entries, connected and selected states, dropdowns,
toggles, section headings and action buttons. It also covers native game
details **Media, Notes, Activity**, the stats strip, secondary action buttons,
sub-navigation and metadata chips. Steam artwork, game icons, existing
controller navigation and the sidebar animation are unchanged.

The theme's native Steam CSS-module translator recognizes extra lazily loaded
network/media/notes components. A revision marker ensures that a hot-reloaded
v0.4.1 instance replaces older v0.4.0 styles instead of keeping stale CSS.
The package verifies both new stylesheets in its installation ZIP, and CI
tests check stylesheet syntax, scope, coverage and foreground/background
contrast. Valve's actual DOM and third-party plugin badges can vary, so the
photos' remaining visual cases still require verification on the handheld.

**v0.4.2-test.5 — visible SteamOS Settings layout styling:** After the
v0.4.2-test.4 screenshot still showed the original blue-gray Internet panel,
the native Settings fallback was upgraded. The earlier probe looked only at
the first 1,450 CSS-class elements and required native rows to advertise a
blue background directly. Neither assumption is reliable on real SteamOS:
hidden DOM nodes can precede the visible screen, and row backgrounds can be
painted by nested elements or CSS gradients.

The new Steam CEF sampler uses `elementsFromPoint` to locate **actually
visible** left-side categories and right-side field strips by screen geometry,
then applies temporary theme markers to the Settings content pane, navigation
pane, rows and painted child strips. CSS is scoped to the native document
root in case Settings is mounted outside the `.BasicUI` subtree.
Matching no longer depends on a row's initial computed color. No text,
SSID, URL or form value is inspected, and no control is replaced. The markers
are removed when Settings is closed. A synthetic test confirms detection
with fully minified class names, transparent row backgrounds, a large
off-screen DOM and correct marker cleanup.

The intended result is navy Settings panels and rows with cyan controller
focus. This is an on-device test release; success in CI does not verify
the actual SteamOS appearance. If elements remain gray, collect
`Game Library → Appearance → Reapply theme & diagnose` after visiting
Settings for at least five seconds; the Settings row count tells us
whether the native watcher tagged the page.

**v0.4.2-test.4 — Settings gray surfaces:** The screenshot from MSI Claw
showed native gray/bright-blue Settings and Internet/Wi-Fi rows still escaping
Midnight styling, although the Steam CEF CSS marker was verified.
Midnight now has a *class-independent Settings-only fallback* inside the
existing Steam CEF watcher. It identifies a two-column Settings layout using
only visible element geometry and blue/gray computed background colors.
It then marks individual settings rows, network row icon end caps and left
navigation items for Midnight styling. This avoids recoloring unrelated
game artwork, Downloads, chats or QAM when Steam CSS modules are minified.
Native controls, network names, keyboard focus order and click behavior are
unchanged. The markers are cleared on leaving Settings; previous marked
rows survive successive watcher scans without flicker.

The fallback also makes the previously missed Settings screen available to
the pre-QAM diagnostic snapshot, so `Detected page route` and row counts can
be meaningful even without recognizable Steam CSS module names. New tests
exercise minified classes, repeated scan stability and cleanup. As always,
actual device visual verification is required: after installing this preview,
open Settings → Internet, look for dark navy network strips, and capture a
new image if any gray sections remain.

**v0.4.2-test.3 SteamOS class-independent diagnostics:** A device screenshot
from v0.4.2-test.2 still showed the Midnight CSS marker as verified in
`Steam Big Picture Mode` but **No active page snapshot** and Settings
`0 / 0`. The previous watcher only saved the page when its expected
Steam CSS class names matched, so it could silently ignore a valid
Settings page whose class names had changed.

The built-in appearance watcher now uses both page-route classification
(Settings / game details) **and** a bounded, class-independent survey
of computed blue-background UI surfaces. It retains only the color,
number of matching elements and a short sanitized CSS class token, never
the page URL, game ID, Wi-Fi network names, text or input contents.
An explicitly labeled **Unclassified** fallback is available when
Steam's page route itself is unrecognized. The diagnostic panel also
reports whether the native Steam watcher is running, how many scans
completed, and the time since the last scan.

This version does **not** recolor unknown Steam elements automatically:
their exact CSS classes must first be observed to avoid accidentally
changing artwork or controls. From Settings > System/Internet, leave the
screen open for 5 seconds, then open QAM > Game Library > Appearance and
run `Reapply theme & diagnose`. The blue surface class/color samples are
the most useful part of the report for the next targeted correction.

**v0.4.2-test.2 QAM-safe diagnostics:** The previous diagnostic reported
`Settings page / rows: 0 / 0` despite a verified Midnight CSS marker
in `Steam Big Picture Mode`. This can occur because native Steam unmounts
Settings/Game Details when QAM is opened to inspect the results. The plugin
now installs a tiny **read-only in-memory page sampler** inside Steam Game
Mode while Midnight is active. It retains the most recent Settings and Game
Details CSS counts and computed background color for up to three minutes.
When QAM opens, Appearance → **Reapply theme & diagnose** can show those
pre-QAM observations, marked with the captured page and age. It does not
store Wi-Fi names, game titles, text nodes, URLs or values. The sampler
stops when Midnight is switched off or the plugin unloads.

This update also fixes an existing CSS-probe bug: a comma-separated
selector caused it to sample the Settings panel rather than a child field
row. To get a useful result, open Settings → System/Internet for at least
two seconds, then open QAM → Game Library → Appearance and run diagnostics.
The change improves our measurement; it does not claim the remaining
bright-blue Settings rows are already recolored.

**v0.4.2-test.1 Steam CSS diagnostics:** v0.4.1 CSS coverage tests
passed while actual Settings and Game Details looked unchanged on the
owner's handheld. That test strategy was insufficient.

The theme runtime now discovers visible Steam Game Mode CEF targets,
validates that the target contains the live Game Mode DOM (not an
off-screen SharedJSContext), and confirms the style revision appears
in that same document before reporting success. It no longer
silently assumes an English `Steam Big Picture Mode` tab exists.

In **Game Library → Appearance → Reapply theme & diagnose**, the plugin
retries injection and reports the actual CEF tab, CSS marker, active
style count, number of native Settings rows/Internet network entries/
Game Details sections, and a sample *computed background color*.
It reports only CSS class names and counts, never network names, game
titles, or other user data. Use it with System Settings or a game's
native details page open and share a photo of the diagnostics if colors
remain unchanged. This is a diagnostic test release, not a claim that
every SteamOS stylesheet selector has already been fixed.

The separate QAM and Steam Menu windows must still be checked on the
actual SteamOS device. Steam client updates can change CSS selectors,
and late-created windows may briefly show native colors until detected.

## Installing

Download `game-library-v*.zip` from [GitHub Releases](https://github.com/Viber85/game-library/releases).

In SteamOS Game Mode: Decky → Settings → Developer → Install plugin from ZIP. Open **Game Library → Open Game Library Dashboard**.

The manual dashboard route remains available. The plugin **replaces Steam Home by default** when Decky loads and Steam visits `/library/home`. Toggle **Use as Steam Home** off in Decky Game Library to restore the original page. It does not change the SteamOS boot process itself; if Decky loads late the original Home may briefly appear first.

## Steam achievement progress

The selected Steam title calls `SteamClient.Apps.GetMyAchievementsForApp(appId)` to
count achievements with `bAchieved === true`, then displays `unlocked / total`
with a blue progress bar like the approved concept. Steam's native
`appDetailsStore.GetAppDetails(appId).achievements` counts provide a fallback
when the detailed achievement list has not loaded. Empty/unavailable
achievement information is never presented as unlocked achievements.
Non-Steam shortcuts have no native Steam achievements and show a dash.

## Native Linux AppImage / Flatpak launches

The user's native Steam Play button launches their AppImages and Flatpaks,
but older Game Library releases did not.

**Fixed in this development version:** Non-Steam shortcuts require the
**64-bit Steam gameID** `(uint32(appid) << 32) | 0x02000000` as the first
argument of `SteamClient.Apps.RunGame`, rather than the 32-bit shortcut
appid used in earlier versions. The plugin checks `appStore.m_mapApps`
using signed and unsigned appid keys, verifies a stored `gameid` belongs
to the chosen shortcut, and computes the canonical gameID if necessary.
It preserves Steam's default launch option `-1` and the documented
Library Details launch source `100`.

This implementation follows the same gameID resolution used by Unifideck.
No launch options, executable permissions, Proton settings or shortcuts
are modified. The Decky build and unit tests pass; actual Play behaviour
must be confirmed on the owner's SteamOS device.

## Updates

The updater follows the installed package version and only recognizes this repository's validated, versioned release ZIP assets. The Decky installer requires GitHub's SHA-256 release digest. It never executes downloaded code in this plugin's Python backend.

**The repository is public.** Decky can now fetch official GitHub release metadata without GitHub credentials. Starting with **v0.2.0-test.4**, the plugin also loads its packaged updater module directly by file path, avoiding the Decky Python `No module named 'updates'` error.

**One-time manual update:** v0.2.0-test.2 and v0.2.0-test.3 may not update themselves because of the existing Python import bug. Install v0.2.0-test.4 from the GitHub Release ZIP through Decky Developer Mode. After that, test the in-plugin Check for updates action.

## Tests

CI runs Python integration tests, TypeScript validation and Rollup packaging. Controller focus, TabMaster sync and game metadata still need **real-device** confirmation.

See [Implementation notes](docs/implementation.md).
