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

**v0.4.14 — automatic tabs without a settings selector:** Tab selection
is now permanently automatic instead of a selectable Auto/Steam/TabMaster
preference. Removed the Library tabs dropdown from the Decky QAM panel,
deleted the manual setter endpoint and frontend state, and removed the
`tab_source` field from the dashboard settings API. Any `tab_source`
value left by v0.4.13 in the saved settings file is ignored; no user
migration or reset is required.

Game Library continues checking Decky Loader's `disabled_plugins` state
every six seconds. When TabMaster is enabled, its saved tab definitions
are shown; when it is disabled or unavailable, the dashboard uses the
built-in All Games / Installed / Favorites / Non-Steam categories.
Re-enabling TabMaster restores its tabs automatically without a restart.
TabMaster and UnifiedDeck settings are never modified. Existing Home and
Midnight theme settings, focus/navigation, game artwork and notification
fixes are unchanged. Automated tests verify the removal of the QAM
selector, legacy preference immunity and enable/disable fallback. On-device
verification still recommended.

**v0.4.13 — automatic library tab sources:** The default tab source is now
**Auto**. Game Library reads Decky Loader's actual
`settings/loader.json` `disabled_plugins` list before importing
TabMaster tab definitions. A saved `TabMaster/settings.json` no longer
counts as proof that TabMaster is enabled. When disabled, uninstalled
or inaccessible, Auto falls back to the Game Library's built-in
Steam-compatible categories (`All Games`, `Installed`, `Favorites`,
`Non-Steam`); when re-enabled, the custom TabMaster tab definitions
return. The dashboard rechecks every six seconds without rebooting
or restarting Decky and resets a stale selected tab (such as Epic) to
`All Games` when that tab disappears.

QAM now exposes **Game Library → Library tabs**, with
`Auto (recommended)`, `Steam` (force built-in core categories),
and `TabMaster` (use its saved definitions only while enabled).
Selection is saved alongside the existing Home and Midnight settings,
without editing either peer plugin's preferences. A disabled TabMaster
cannot be forced on merely by choosing TabMaster mode. Auto's fallback
is a reliable subset of native-style Steam categories, not a literal
runtime snapshot of Valve's entire varying tab set (e.g. Collections
and Great On Deck are not yet mirrored in this custom dashboard).

Tests simulate disabled → enabled TabMaster while its old settings
file remains in place, missing/corrupt Decky loader state, manual modes,
and preference preservation. The frontend test checks polling and
clearing stale selected tab IDs. All previous theme, layout and volume
notification transparency fixes remain untouched. Verify on the
handheld by disabling and re-enabling TabMaster in Decky.

**v0.4.12 — larger game carousel and selected-game details:** The Game Library
home dashboard now gives more prominence to both parts of the main view.
Standard carousel posters grow from 254px to 274px tall, with a wider card
and a slightly larger title overlay. Selected-game logo art grows from a
72px maximum to 80px, the title can reach 40px, and the status tags,
Playtime, HowLongToBeat, Last Played and Achievements cards are larger.
Metrics now use a 92px card height, larger values and icons, slightly
more spacing, plus a thicker achievement progress bar. Play/Install and
Game Details buttons are proportionally larger and retain their existing
high-contrast controller focus rings.

The design is adjusted for SteamOS compact heights: intermediate screens
at or below 820px use 260px posters and 88px metrics; shorter screens
switch to 213px, 196px or 181px posters, with correspondingly smaller
logos, text, and metric cards. This preserves the selected-game actions
and Steam's native footer without requiring scroll. The wider bottom
content area is still bounded so it does not overwhelm the game's hero
artwork. The full-grid listing, TabMaster tabs, navigation, Midnight
Settings CSS, system status pill, and achievement/volume notification
transparency are left unchanged. Automated tests check responsive
dimensions, all four metrics, HLTB's three columns and estimated
vertical-space budgets; final appearance requires verification on MSI
Claw hardware.

**v0.4.11 — remove idle Settings row backgrounds at the source:** The
v0.4.10 MSI Claw screenshot of Audio proved that broad cobalt Settings
strips were still being painted. The root cause was conflicting older,
higher-specificity native `gamepaddialog_Field`, list and
`#GamepadUI_Full_Root[data-glm-settings-root]` rules that explicitly
filled idle rows even after the later transparent override. Those original
rules now set **transparent** backgrounds directly (including network
and minified-class markers), instead of attempting another low-priority
CSS overlay. The old 1px fake separator/shadow was also removed entirely,
as requested. Only genuinely focused rows retain the blue highlight;
unfocused mouse hover does not recolor a full row.

Valve can paint a row in a nested 100%-width child or grandchild layer:
the native CEF marker scan now walks a bounded three-level row subtree
and marks broad painted wrappers, including full-width children the prior
98% width cutoff excluded. It explicitly skips buttons, dropdowns,
sliders, toggle tracks, input controls and icons. A Settings-scoped
pseudo-element override also clears native `::before`/`::after` row
background paints. The solid Midnight canvas remains beneath the now
transparent rows; interactive controls keep their own filled backgrounds
and cyan focus. The Steam volume/achievement root transparency fix,
QAM appearance and quick stylesheet updates remain unchanged.

Prior to release, automated GitHub CI passed with a CSS rule audit that
rejects opaque inactive-row declarations and simulated DOM tests for
nested full-width paint layers and preserved dropdown controls. These
tests do not provide a live screenshot from the user's handheld, so final
visual acceptance still requires an on-device check of Audio, Downloads
and Friends & Chat.

**v0.4.10 — transparent Settings rows (Variant A):** In response to
the MSI Claw screenshots showing that flat blue Settings rows still stood
out against the Midnight background, inactive rows and section headings
are now **transparent**. They inherit the existing flat
`#0A1B30` Settings canvas instead of drawing a different blue strip.
A subtle, layout-neutral 1px inset separator keeps long pages readable.
Controller/keyboard-focused rows retain the full Midnight blue
`#163A5E` highlight with a cyan left accent. Dropdowns, text inputs,
buttons, toggles and slider controls stay filled and clearly interactive.
Network rows receive the same transparent treatment.

The override is added at the end of the native Settings stylesheet,
scoped to a *verified* Settings DOM. It supports readable Steam CSS
modules and class-independent DOM markers, with zero-specificity
exceptions that prevent normal rows from overriding their own focus.
No component sizes, navigation order, selected game artwork, QAM styles
or Steam notification overlays are changed. The pre-paint and stable
CSS injection improvements from v0.4.9 remain intact.
Automated tests verify selector scope, focus override, subtle separator,
and preservation of interactive controls; confirm the real visual
appearance on the handheld after installing the release.

**v0.4.9 — flat Settings canvases and minimal color flash:** The MSI Claw
screenshots of Display, Downloads and Family showed a bright gradient
behind the otherwise flat Midnight rows. The verified native Settings root,
the outer scroll/content pane and its large painted child surfaces now
share a single solid `#0a1b30` canvas, with field strips retaining
`#0f2842`. The fallback recognizes categories with few or no full-width
rows (such as Family) from the full Settings left navigation. A single
large action button is not recolored as a field row.

The native CEF watcher no longer removes and re-adds *every* existing
`data-glm-*` marker on each scan. It keeps markers on stable elements and
cleans up only stale ones when leaving Settings. Steam React DOM mutations
now cause a synchronous scan at the MutationObserver microtask checkpoint,
normally before the first browser paint of new Settings content, with
`requestAnimationFrame` kept as a safety pass for staged layouts.
When Steam lazy-loads new CSS modules, the runtime installs and verifies
the new stylesheet **before** removing its previous working copy, avoiding
a flash of the native Steam palette during reinjection.

All paint overrides are limited to a detected Settings layout, keeping
the established volume/achievement transparent overlay fix intact.
Regressions cover sparse pages, stable styling, before-paint updates,
native CSS hot-swaps and non-Settings cleanup. A completely zero-frame
transition cannot be promised for every future SteamOS CEF build; the
actual visual result still requires testing on the MSI Claw.

**v0.4.8 — clear gamepad focus and larger carousel:** Based on the
MSI Claw screenshot where `Install` looked almost identical while
focused and on the QAM screenshot showing cropped selected-tab borders.
The dashboard's `Install`, `Play`, and `Game Details` buttons now
display a strong, high-contrast 3px white focus ring plus 6px cyan
halo and a slight 2px lift. The bright primary button has a quieter
default glow to improve the difference between idle and focused.
Keyboard/gamepad focus uses the existing Decky `gl-focused` class and
`:focus-visible` without changing any focus/navigation logic.
The reduced-motion setting disables the lift animation.

Native Steam QAM tabs now mirror the Game Library rail with a rounded
12px blue focus surface and **inset** cyan focus border. This fixes
the visibly cropped outer shadow while leaving QAM icons, layout and
controller behavior untouched. QAM stays scoped to actual tabs; the
global Steam UI root remains transparent to preserve the previously
fixed volume/achievement black flash.

The main carousel's posters are approximately 6–7% larger in height
and slightly wider (standard height 238px → 254px, reduced-height
layouts 195px → 207px, compact 178px → 188px). The full-library
grid and selected-game detail panel remain unchanged. Regression tests
cover focused actions, responsive poster sizes, and QAM focus ring
scope. As usual, the final visual acceptance must be confirmed
on the handheld.

**v0.4.7 — full-height rail and independent status pill:** After the
on-device screenshot of v0.4.6, the dashboard's entire left navigation
now stretches from the physical screen's top edge instead of inheriting
the root padding reserved for main content. Only the main dashboard
content has top spacing; full-screen hero backgrounds continue uninterrupted.

The selected TabMaster tab title (for example `Installed`) remains a
large standalone heading on the left. The floating frosted-glass *pill*
now encloses **only** the real status icons and controls on the top
right—Search, Notifications, Wi-Fi, Bluetooth, battery, clock and the
Steam avatar. It is sized to its contents, not a full-width header.
Avatar lookup now checks the active account and Steam's own friend/persona
stores in addition to the previously supported account hash; an invalid
avatar URL falls back to the generic icon safely.

Carousel posters are wider and taller, with responsive limits on smaller
screens so the selected game's details retain room. Removed the unnecessary
`N games · L1/R1 Tabs · ↑ Tabs · ← Navigation` line below
the carousel; controller functionality is unchanged. All modifications
remain scoped to the plugin dashboard, preserving Midnight styling and
the existing volume/achievement notification transparency fix. Build and
regression tests cover the isolated status pill, full-height sidebar,
larger poster sizing and updated avatar handling. Validate the spacing
and picture on the actual MSI Claw after installation.

**v0.4.6 — complete floating SteamOS-style status bar:** The header keeps the
large active TabMaster tab name on the left and now shows Search,
Notifications, Wi-Fi, Bluetooth, battery with actual percentage and charging
icon, a live clock and the current Steam avatar on the right. Notifications
show a real unread badge when Steam's notification store is accessible;
unavailable count does not become a fake zero. The avatar is read from the
existing Steam user store when available, otherwise a neutral person icon
is used. The notification, network, Bluetooth, battery and profile controls
open Steam pages. Controller Up from tabs focuses the search control; Down
returns to the active tab and L1/R1 shortcuts are preserved.

Battery readings use the local Linux power-supply device; Wi-Fi uses
NetworkManager connection state and signal and Bluetooth uses Linux rfkill
or the local BlueZ adapter state. These are **read-only** calls via the
packaged Decky Python backend. They never send or display SSIDs, addresses
or device identifiers. Missing data results in an unavailable-state icon,
not invented percentages or radio states. Device status is refreshed every
12 seconds; live Steam notification/avatar information every 5 seconds.
No extra daemon, root mutation or network requests are needed for hardware
state. The native Steam overlay CSS and the previous volume/achievement
flash fix are untouched. Automated checks cover the new status collector,
frontend icon wiring, focus behavior and ZIP packaging; confirm the actual
hardware data on MSI Claw after installation.

**v0.4.5 — floating active-tab header:** The dashboard's header now shows
only the currently selected TabMaster tab (for example Steam or Epic),
in larger, high-contrast typography. The redundant `Game Library`
title and divider are gone. Its top bar is a separate rounded, translucent
frosted-glass surface close to the upper display edge instead of a
full-width opaque strip. On the right, a functional Steam search shortcut
and a live local clock appear; neither pretends to expose SteamOS Wi-Fi
or battery state. Steam's system status bar may be absent or covered
depending on the current Game Mode environment, so the new header does not
depend on its visibility. The floating panel is part of the dashboard only,
never a global CSS overlay. Existing selected-game hero, library filtering,
controller L1/R1 navigation, and the fixed Midnight notification overlay
transparency remain unchanged. Tests cover heading, real search action,
clock refresh and focus navigation. Check the physical handheld for exact
screen-edge spacing.

**v0.4.4 — glass library header and cleaner game details:** Removed the
repeated `Selected from your Steam library` text beneath every selected
game title. The Game Library dashboard again shows a dedicated top
header, styled as a translucent/frosted Midnight bar like the approved
reference. The left side displays the bold `Game Library` title and the
name of the currently selected TabMaster tab in similarly prominent
type, separated by a thin cyan divider. The existing tab pills sit
directly below in a matching glass treatment; controller focus, tab
counts, sort control, L1/R1 switching and View More are unchanged.
The top header lives BELOW SteamOS's native status bar and does not
create duplicate search, wireless, battery or clock controls. Responsive
rules keep long tab names ellipsized on narrow screens and reduce its
height on handheld displays. No native Midnight CSS or notification
surface code was changed.

**v0.4.3 — consistent Midnight Settings and Storage:** System, Internet
and Storage now share the same layered palette: sidebar `#081425`,
main Settings content `#0A1B30`, sections and list rows `#0F2842`,
action controls `#123452` and focused rows `#163A5E`.
Storage's disk selector cards, usage-bar track and application list have
dedicated `contentmanagement_*` selectors, resolved through the current
Steam CSS module aliases when Valve minifies its class names. The Settings
watcher now marks the outer content pane rather than only the inner games
scroll list, so the Storage header and rows share the same background.
Steam artwork, native icons, disk usage segments, controls and scroll
behavior are preserved. Crucially, the volume/achievement notification
overlay transparency fix from v0.4.2-test.8 remains untouched:
there is no unconditional full-screen `.BasicUI` or GamepadUI fill.
Automated tests check colors, CSS alias handling, nested Storage lists,
and no blanket Steam overlay background. The exact visual match on the
handheld still needs to be confirmed after installation.
**v0.4.2-test.8 — notification overlay transparency:** On the MSI Claw,
raising/lowering volume or showing an achievement briefly blanked the game
to black only while Midnight was enabled. This implicates the built-in theme
but does not yet prove which individual CSS selector is responsible.
Removed the blanket `background-color` override for
`#GamepadUI_Full_Root` and `.BasicUI` in shared.css. Steam can reuse
those root containers for transient notification/compositor surfaces,
which must remain transparent over a game. The Midnight variables and
targeted QAM, Steam Menu, Settings, Downloads and game detail styles are
retained; Settings detection, row colors and scroll logic are unchanged.
The revision marker is incremented so old injected styles are replaced,
and the coverage test rejects unscoped full-root background fills.

This release is a **targeted diagnostic fix**. Confirm in-game volume and
achievement notifications no longer blank the screen. Some general
backgrounds may fall back to native Steam colors where no dedicated
Midnight selector exists; report any such regression rather than
reintroducing an opaque root background.

**v0.4.2-test.7 — scroll and background continuity:** Addresses the
last visible black bands behind SteamOS Settings fields and the off-screen
rows that appeared in native gray/blue only after scrolling. When the
existing Midnight layout classifier recognizes Settings, its right-hand
scroll canvas now uses the same `#0c1b32` blue as the rows, including
underlying gaps and immediate scroll-content wrappers. Existing rows
outside the visible viewport are marked in a bounded scan of the confirmed
Settings content pane (up to 2,400 elements), using horizontal geometry,
without requiring them to be visible first. Steam's native controls,
icons, artwork, and navigation are preserved. A captured scroll listener
re-evaluates reused/virtualized rows (throttled to 100 ms); DOM mutation
observation remains the primary path for newly mounted content. The
listener is removed when the theme turns off or reinitializes. New tests
verify below-the-fold rows receive theme markers before scrolling and
small controls aren't wrongly treated as whole rows.

This is a test release: CI can validate the synthetic conditions, but
the appearance of actual scrolled pages must be checked on the handheld.

**v0.4.2-test.6 — near-immediate Midnight Settings styling:** Replaces
the native CEF Settings watcher's 1.8-second polling-only response with a
`MutationObserver` watching structural Steam UI changes. Newly mounted
Settings elements are inspected using one batched
`requestAnimationFrame` callback, before the next paint when possible.
The existing visual geometry classifier, actual Midnight CSS and controller
navigation are unchanged. Observing `childList` only avoids self-triggering
scans when our `data-glm-*` CSS markers are added or removed.

A five-second backup scan handles unusual Steam changes that do not insert
DOM nodes. Older browsers without `MutationObserver` retain the original
1.8-second interval. The watcher, pending animation frame, and timer are
all cleaned up when the theme is disabled or an older watcher revision is
replaced. New tests check frame coalescing, no attribute feedback loops,
and cleanup. Real-world fade/flash elimination must be confirmed on-device.

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
