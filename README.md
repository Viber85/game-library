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

**v0.4.21-test.24 — preserve the elusive blue gamepad flash (diagnostic):**
MSI Claw screenshots from test.23 prove that the Midnight CSS is applied
(rail rgb(8,20,37), selected focus rgb(22,58,94), native Fields rgb(15,40,66)).
Yet the first five printed focus frames show only settled navy colors, so
the cause of the visible brighter-blue animation is still **not identified**.
Test.23 sorted selections by DOM order and could sample an older selected row
before the new D-pad target, and retained only the latest 28 frames.
Test.24 prioritizes the actual focused node, checks up to 96 native sidebar
descendants and their ::before/::after paints for a transient brighter blue,
then preserves up to eight distinct brighter-blue frames separately from the
rolling trace. Appearance now exposes concise highlight class/color entries
and a dedicated copy action, allowing phone photos to be useful even when
clipboard copying is unavailable. No CSS focus color change is shipped here:
this is a measurement correction, not a speculative visual fix. Audit watcher
revision 19, CSS marker revision 75, and regression tests prevent stale
instrumentation and missed newly focused rows.

**v0.4.21-test.27 — category-only Settings focus ring**

The user verified test.26 restores a good cyan outline and glow on the active Keyboard category, but pointed out an unwanted second cyan outline wrapping the entire left category list. The native outer list `.Panel` receives `.gpfocuswithin` whenever a nested row is focused, causing test.26 to style both ancestor and row. In test.27, the same focused-row selectors now exclude a Panel that contains another focused Panel. This preserves the 2px cyan row outline and 20px glow but removes the duplicate list-wide frame. Applies to SteamOS Settings and Decky Settings only; no geometry, input handling or right-pane changes. Style marker 78. Physical device verification pending.

**v0.4.21-test.26 — native Steam/Decky Settings focus outline and glow**

The reported visual issue is missing *cyan outline and blue glow* around the D-pad/left-stick focused category, not a short blue flash. The v22/v25 native focus rules reset `outline:none` and `box-shadow:none`, including more-specific Decky Settings overrides. Restore a focused-row 2px #63cfff outline and 20px blue glow on the real .Panel row inside .PageListColumn, using CEF-evidenced native structure and a final selector with enough specificity for both Settings. Only the currently controller-focused row receives the frame; selected-but-unfocused entries stay unchanged. No input event, hitbox, layout, QAM, or global panel changes. CSS revision 77; confirm visually on hardware.

**v0.4.21-test.25 — native outer Settings focusable Panel paint**

Test.24 reported zero detected bright-blue events even while the known controller-only flash persisted. Photos from test.23 showed the left rail itself at rgb(8,20,37), but its outer .Panel.Focusable wrapper at rgb(10,27,48). The original Settings focus CSS used .BasicUI ancestry, which might not include that outer native wrapper. Add a narrowly scoped rule to .Panel.Focusable:has(> .PageListColumn) and its decorative pseudo-elements to prevent a native gamepad highlight from temporarily repainting the wrapper. Apply to BOTH Steam Settings and Decky Settings, with no geometry, input handlers, or unrelated panel changes. A suspected cause, pending on-device test. CSS revision 76.

**v0.4.21-test.23 — controller focus transition CEF diagnostic
(device diagnostic):** The user confirmed the brief brighter-blue flash
persists in BOTH Steam Settings and Decky Settings using the D-pad or
left analog, but NOT on touchscreen. Prior CSS-only attempts could not
identify the actual painted layer. Existing CEF color observations
sampled every 900ms, missing this short transition. Add a bounded,
event-driven **focus trace** to the existing main Steam CEF watcher:
listen to native focusin/focusout and class/style/aria mutations inside
the verified Settings `PageListColumn`, immediately record computed
background color/image category, shadow, animation name, transition
duration and CSS class for focused row, parents, relevant hit-test
layers, plus their `::before` and `::after` pseudo-elements. Then
capture five subsequent animation frames to catch transient colors.
Retain at most 28 recent snapshots in volatile CEF memory. Read them
using the existing **Read CEF diagnostics (no reload)**, without
resetting the theme. The Appearance panel displays the latest frames
and offers **Copy gamepad focus transition trace**. The trace does not
read text, input values, network names, URLs or game/plugin names;
only bounded class names and computed paint metadata. No changes
to existing CSS, Steam/Decky focus colors, QAM, Power, Volume,
controller handling or layout in this diagnostic build.
Watcher revision **18** and marker revision **74** install the tracer.
Tests cover pseudo-layer sampling, privacy, mutation/animation-frame
capture, cleanup and packaging. Once real MSI Claw focus transition
frames are captured we can make a targeted fix based on measured
elements rather than issuing another speculative CSS patch.

**v0.4.21-test.22 — shared native Steam/Decky Settings gamepad focus
(device preview):** User determined the original left navigation flash
occurs only when using D-pad or left analog to move through menu items;
touch navigation is stable. The issue affects BOTH Decky Loader
Settings and ordinary Steam Settings, which use Steam's common
`PageListColumn` / `Panel` / `Focusable` controller navigation.
Earlier test.19/20 attempted to patch Decky only and did not cover
the focus overlay, leaving Steam Settings inconsistent. This release
adds a new **shared, main-only stylesheet loaded last**:
`settings-gamepad-focus.css`. It explicitly scopes all rules to the
native Settings left rail and focuses its rows/Focusable children,
including Steam `.gpfocus`, `.gpfocuswithin`, `:focus-visible`,
selected/current attributes, and native focus pseudo-layers
`::before` / `::after`. The rail stays `#081425`, focused/selected
rows use `#163a5e`, native bright-blue pseudo backgrounds are
suppressed, and focus transitions/animations are disabled on the
navigation items only, not the right pane. CSS is immediately present
in Steam's main CEF, so it does not wait for `DialogControlsSection`
or any URL/DOM marker to paint. Gamepad layout, icons, input handlers,
touch interactions, QAM, Power, Volume, and all content rows retain
their existing behavior. CSS revision **73** forces re-injection.
The verified v18 Decky CSS remains unchanged and the test.21
package guard against accidental additions to Decky CSS stays in
place. A new native Steam/Decky Settings rail regression suite and
package guards enforce targeting and cascade order. On-device
controller focus behavior still needs verification.

**v0.4.21-test.21 — emergency revert of Decky left-rail CSS regressions
(device rollback):** On MSI Claw, v0.4.21-test.19 and test.20 failed to
remove the Decky left navigation flash and caused the same issue on the
native Steam Settings page. Root cause: both releases appended
`.BasicUI .Panel:has(> .PageListColumn)` selectors WITHOUT the
right-pane check that had kept the known-good v0.4.21-test.18 rules
restricted to Decky's two-column Settings layout. Native Steam Settings
also has a PageListColumn, so those additional rules can affect Steam
Settings and its selected items, causing a global regression.
This release restores **system-theme/decky-settings.css byte-for-byte
from the previously confirmed functional v0.4.21-test.18**. It removes
both v19 and v20 unscoped overrides; all other features and diagnostics
remain. No new CSS modifications or guesses. CSS revision **72**
forces new injection; automated tests and packaged ZIP checks now
explicitly forbid unscoped native rail rules. The v18 short-lived left
rail flash may return; fix that only after capturing which exact element
changes state during the transition, without risking global Steam UI.

**v0.4.21-test.20 — stabilize active left navigation item, not only the rail
(device preview):** MSI Claw reports that the brief brighter-blue
flash persisted in test.19. Source review found that test.19 only
stabilized the left PageListColumn's dark background; the rule for its
FOCUSED/SELECTED child still depended on the right
`DialogControlsSection` being present. During a tab transition the
right content can briefly disappear, causing the default Steam focus
color to shine through a child *above* the dark rail. Duplicate the
already working dark-blue selected-state rule directly under the
persistent left `Panel > PageListColumn`, independent of right
content, URL, marker or watcher. It supports Steam's gpfocus,
gpfocuswithin, focus-within, aria-selected/current and native selected
classes, and focuses parent Panel when a descendant owns gamepad focus.
Selected rows remain `#163a5e`; idle rail stays `#081425`.
Disable only row paint transitions/animations and native background
images, preserving Steam Input, row geometry, other controls, QAM,
Power, Volume and all other native screen styles. Theme CSS revision
**71** forces a clean stylesheet update. Regression tests check the
focus rule does not depend on right-side DOM. Device verification is
still required.

**v0.4.21-test.19 — eliminate bright-blue left rail flash in Decky Settings
(device preview):** v0.4.21-test.18 was confirmed working on the MSI
Claw, including all four Decky Loader Settings pages and direct CSS
matching. A short light-blue rail flash remained when changing pages.
Cause: the original left rail rule was conditioned on the RIGHT
`DialogControlsSection`, which Steam may briefly unmount while
switching Decky tabs. During that interval the `:has()` prerequisite
failed, exposing the native light-blue rail. Append a permanent,
right-pane-independent CSS rule scoped strictly to the actual mounted
`.BasicUI .Panel:has(> .PageListColumn)` and its direct
`PageListColumn` child, both already observed on the device.
Set only navy `#081425` background, remove inherited background
images and disable temporary rail background transitions/animations.
The right pane, item focus, selected row colors, controls, QAM,
Power, Volume and layout are all unchanged. The fallback uses the
same dark rail color as the existing Steam Settings theme.
CSS marker revision **70** invalidates prior cached styling.
Regression test verifies rail isolation from right-hand DOM; verify
visually by switching Decky pages on the physical device.

**v0.4.21-test.18 — direct Midnight CSS for observed Decky CEF DOM
(device preview):** The actual MSI Claw test.17 CEF screenshots show
the Decky route marker as **Not detected** while the Steam CEF theme is
loaded. The native Decky rail is `PageListColumn` inside a `Panel`,
originally `rgb(43,45,51)`; the right `DialogControlsSection` is
inside a SEPARATE Panel, and repeatedly painted gray Field wrappers
carry a class beginning `_eKmEXJCm_`, `rgb(35,38,46)`. Rather than
wait for an inaccessible React Router URL, preloaded CSS now directly
matches the live two-column layout with
`html:has(.BasicUI .PageListColumn):has(.BasicUI .DialogControlsSection)`.
It applies immediately as native DOM is mounted, without the old
multi-second polling marker. New native-only colors: navy sidebar
#081425, content #0a1b30, unfocused cards #0f2842, focused #163a5e,
buttons #123452/#1d527d; no outlines, glows or input geometry changes.
Original install/reinstall, toggles and Developer/Testing controls
retain functionality. Diagnostics separately show whether actual
Decky DOM is observed and whether the CSS rule set computed
`--glm-decky-observed-layout:1` on the rail Panel, so it is no
longer enough to merely verify that CSS was injected. Watcher revision
**17** and stylesheet marker revision **69** ensure a fresh load.
Tests reference the exact field class and two Panel structure from
the device evidence. Other menus and native Steam Settings untouched.
Appearance and responsiveness still require MSI Claw validation.

**v0.4.21-test.17 — actual Steam CEF class/color diagnostics
(device diagnostic):** Decky Settings was unchanged despite earlier CSS
tests. This release intentionally does NOT add new visual rules.
Instead the preexisting Steam CEF watcher retains up to 8 distinct,
bounded observations of visible left/right painted components, including
their Steam class tokens, parent class tokens and computed backgrounds,
independent of React Router's URL, the Decky marker or nav row counts.
Sampling is capped to once per 900 ms and remains solely in the Steam
CEF tab's memory. It reads NO displayed text, network/user names,
plugin labels, game titles, input values or URLs. The Appearance button
is now **Read CEF diagnostics (no reload)**: the old Reapply operation
removed the watcher and erased the useful snapshot before inspection.
The UI shows recent evidence and a copy control. Open each Decky
Settings page, then return to the Game Library panel to inspect or copy
the actual classes and colors. CSS and interactions for Steam menus,
QAM, Power, Volume and Decky remain unchanged. Watcher revision 16 and
theme revision 68 ensure new diagnostics are installed. Tests verify
capture without a Decky route, bounded parser and no refresh on inspect.
Visual changes follow separately once actual MSI Claw selectors are known.

**v0.4.21-test.16 — Decky 3.3.1 verified route & native Steam components
(device preview):** The previous test.15 had no effect on MSI Claw.
Inspection of exact Decky v3.3.1 sources shows
`frontend/src/plugin-loader.tsx` registers `/decky/settings`,
`frontend/src/components/settings/index.tsx` renders
`@decky/ui SidebarNavigation`, and General, Plugins, Developer,
Testing use Steam-sourced `DialogBody`, `Field`, `DialogButton`,
`Toggle` and `Dropdown`. `ReorderableList` is composed of native
`Field` elements in `@decky/ui` v4.16.4; the class
`reorderablelist_Entry` assumed in test.15 did not exist.
`SidebarNavigation` is resolved dynamically from the installed
Steam webpack, so actual page classes are Steam CSS modules, not
owned by Decky. Replace the unverified four-sidebar-row *geometry
gate* with direct recognition of Decky's confirmed registered route,
including its child pages and History hash form, even while content
is lazy loading. Main-window `decky-settings.css` now targets
native Steam PagedSettingsDialog side rail, content, nav entries,
and specifically Steam Field (not FieldLabel) and DialogButton
components, with the existing webpack class-alias compiler.
Midnight palette remains navy idle `#0f2842`, lighter blue focus
`#163a5e`, dark blue rail and buttons, no cyan outlines or glow.
QAM, native Steam Settings, Power and Volume are not changed.
Theme diagnostics now expose whether the Decky route is detected,
the count of native Field matches and their computed background color.
Stylesheet revision **67** and watcher revision **15** replace old code.
Regression tests verify an empty Decky page before components mount,
all four Decky routes, false-positive routes and CSS aliases.
Real visual result on MSI Claw still requires confirmation.

**v0.4.21-test.15 — Midnight Decky Loader Settings in all four tabs
(device preview):** Decky Loader General, Plugins, Developer and Testing
use the shared @decky/ui SidebarNavigation with **four** categories;
the previous Settings DOM recognizer required nine or more, so those
panels never received Midnight markers. Recognize four native nav
items and wide Settings fields immediately in the existing pre-paint
MutationObserver. A new `decky-settings.css` is bundled in the main
Steam document **once**, with no per-category CSS re-injection and no
five-second fallback delay. The Decky-only marker scopes dark #0a1b30
backgrounds, left rail #081425, ordinary cards #0f2842, selected
#163a5e, action buttons #123452/#1d527d and readable headings.
No cyan focus outlines or glow, as agreed for Settings. No changes
to Decky action handlers, ReorderableList controls, switches, sliders,
row sizes, the native Steam Settings pages, QAM, Power or Volume.
Watcher revision 14 and stylesheet revision 66 force fresh theme
injection. CI checks scope and packaging; real Claw visuals still
need confirmation.

**v0.4.21-test.14 — remove delayed gray flash in Settings
(device preview):** The native gray rows in test.13 correctly turn
Midnight navy, but can stay gray for several seconds after opening a
Settings category. The watcher previously observed only inserted DOM
children. Steam often REUSES existing rows and changes their
`class`, `style`, `aria-selected` or `aria-checked` attributes;
those updates had to wait for the five-second fallback scan. Now they
trigger the same fast pre-paint scan, coalesced per animation frame.
Our own `data-glm-*` attributes are excluded to prevent a mutation
feedback loop. Also keep previously recognized Settings row/background
markers when native gray has already been recolored navy/transparent,
otherwise the next scan could prune a valid row and cause a flash.
Retained rows are still screened for geometry, controls and image
backgrounds. No changes to row dimensions, controller behavior, QAM,
Power, Volume or main Steam menu. Watcher revision **13** and CSS
revision **65** clear stale code. Regression tests now simulate
successive scans after applying Midnight, plus class/style mutations.
Device-level visual timing remains to be confirmed.

**v0.4.21-test.13 — gray Settings surfaces detected by paint, not route
(device preview):** The v0.4.21-test.12 MSI Claw report confirmed
that all three target rows stayed unchanged. The prior implementation
required a specific `/settings/<category>` browser path AND a
`role=button/radio` focusable. Real Steam clients may use different
routes or plain DIV card surfaces, leaving no matches despite passing
synthetic tests. The new Settings watcher detects **broad, opaque
gray-blue surfaces in the verified Settings content pane** without
requiring a category URL or focusable role. Toggling, sliders, inputs,
artwork and background-image URLs are excluded. A native
Field+Clickable/Field+radio fallback covers named Steam CSS modules.
Retains dark navy idle fill, lighter blue focus, no cyan outlines or
glow, and protects controller actions, QAM, Power, Volume and the Steam
menu. Existing Settings focus CSS remains last. A live diagnostics
counter and computed background color for matched Settings rows are
shown by `Reapply theme & diagnose` in Game Library Appearance,
allowing real-device verification rather than relying only on CI.
Watcher revision **12**, CSS revision **64** and new no-route tests
prevent reuse of stale scripts. On-device appearance remains to be
confirmed.

**v0.4.21-test.12 — Internet, Keyboard and Customization special rows
(device preview):** Three MSI Claw screenshots showed that Wi-Fi network
entries, the Keyboard layout row and Customization movie cards retained
native gray backgrounds even after Settings focus changes. Steam
renders these as wide actionable Field/radio/card surfaces, frequently
outside the generic Settings row markers. A conservative watcher now
identifies only those three Settings routes after verifying the native
two-column Settings layout. It marks wide interactive rows in the
content pane, skipping toggles, sliders and inputs, and optionally
marks full-row gray child backdrops (never media or preview imagery).
The new main-window-only `settings-special.css` paints deep navy
idle rows (#0f2842) and light-blue focus (#163a5e) WITHOUT a border
or glow, preventing Valve's gray focus animation from overriding it.
Steam controls, thumbnails, navigation geometry, QAM, Power, Volume
and game pages stay untouched. Watcher revision 11 and native style
revision 63 invalidate older cached styles; regression/ZIP tests check
the integration. Visual behavior still needs confirmation on Claw.

**v0.4.21-test.11 — focus without outlines throughout Settings
(device preview):** The MSI Claw Display/Brightness screenshot shows the
desired bright blue focused row but an unnecessary cyan outline.
New `settings-focus.css` loads LAST only in Steam's main window and
removes focus outline, border stroke and box-shadow from native Settings
field strips, left navigation, networks, list rows, storage and focused
Settings buttons/dropdowns. It leaves the **existing brighter blue
focus fill completely unchanged**. Slider/toggle tracks, geometry and
controller input are untouched, as are the repaired QAM, main Steam
menu, Power and Volume. CSS revision 62 refreshes cached native CSS.
Regression tests check main-only scope, hash aliases, existing blue
fills and ZIP integrity. MSI Claw visual confirmation remains required.

**v0.4.21-test.10 — fix Power focus in Steam's real main window
(device preview):** The MSI Claw screenshot from test.9 still showed a
native orange Power highlight. Root cause: Steam renders the Power popup
as a **BasicUIContextMenu inside the main window** while test.9 bundled
its rules into the overlay only. Fix the theme bundle to load
`power-menu.css` in both main and overlay, after the generic dialog
styles. Steam builds may also render the popup using generic
`.BasicUIContextMenu`, `[role="menu"]`, `.contextMenuItem` and
`[role="menuitem"]` instead of the previously targeted
`gamepadcontextmenu_` selectors. Add these precise fallback selectors
with the same single inset cyan border, blue focused fill and soft glow.
No layout size, controller handlers, game-wide CEF backdrop, QAM, main
Steam nav or Volume changes. Native CSS revision **61** clears stale
injection. New scope and selector regression checks verify the main
Power menu is genuinely themed; actual Claw rendering still requires
a device photo.

**v0.4.21-test.9 — Midnight native Volume and Power menus
(device preview):** The Power submenu screenshot shows Steam's default
white focused row and a flat blue panel over the running game. A small,
overlay-only stylesheet now recolors the Power/context-menu panel and
its header and replaces the native focused-row fill with one inset
2px cyan ring, blue Midnight gradient and soft glow, without altering
shutdown/restart actions or menu geometry. A separate Volume stylesheet
covers Steam's short-lived hardware volume pop-in in both main and
overlay documents: navy surface, cyan edge/glow, readable labels and
cyan slider progress. Critically, no styles paint the game-wide CEF
root, ModalOverlayBackground, or notification layers. Audio,
GamepadContextMenu and BasicContextMenu class aliases are resolved
dynamically for minified Steam builds. QAM and main Steam menu CSS
remain identical to test.8. Revision **60** replaces cached native CSS;
new scope/geometry tests and packaged-ZIP checks verify both modules.
Exact visual appearance on MSI Claw still requires on-device testing.

**v0.4.21-test.8 — restore native QAM geometry; keep cyan focus
(device preview):** MSI Claw screenshots exposed a squeezed vertical
Decky tab outline and a plugin list pushed off the right side of QAM.
This came from forcing the native QAM tab rail to 86px, its inner column
to 74px, and each icon to `calc(100% - 10px)` with further margin and
padding. SteamOS/Decky must own these widths. Remove *all* QAM width,
min-width, flex-basis, margin, padding and sizing overrides; preserve
the current direct native Tab selector and selected/focused cyan border,
blue gradient and soft glow. This frees the plugin content pane to use
its native space, and returns icon geometry to Steam's normal layout.
The native Steam button menu and our Game Library left rail are
unchanged, as are TabMaster/UnifiedDeck, controller navigation and
game launches. CSS revision **59** replaces older injected styles.
Automated tests assert there are no QAM geometry overrides and that
both selected/focused icon rings and ZIP CSS remain intact. On-device
visual validation is still required.

**v0.4.21-test.7 — give the native Steam menu focus glow room
(device preview):** MSI Claw screenshots showed the 20px cyan glow ending
abruptly at the focus row's upper, lower and right boundaries. The native
main-menu rows now use 12px vertical and 22px horizontal margins, a
correspondingly paired width, and a minimum height of 76px. Focused rows
allow the shadow to overflow; both decorative layers share a 10px
vertical / 12px horizontal inset. This leaves clearance for the bloom
without moving the native icons, adding an outer blue background or
introducing a second border. The original 20px glow, single cyan frame,
blue fill inside that frame and native focus/navigation remain intact.
QAM, TabMaster/UnifiedDeck, game launch and Game Library's own left rail
are unchanged. CSS revision 58 invalidates older injected styles.
Regression tests cover focus geometry, space around the glow, CSS alias
resolution and ZIP packaging. Visual confirmation on MSI Claw remains
necessary.

**v0.4.21-test.6 — remove the blue rectangle outside the Steam menu
focus border (device preview):** Device photos showed that the focused
native menu item still painted the blue gradient across the full row,
including the 4px/8px gutters around the inset cyan ring. The native
focused row now has a **transparent background**. A pointer-transparent
`::before` is inset by the same 4px/8px as the existing `::after`
frame, with the original gradient and 10px rounded corners. The new
fill is stacked behind native labels/icons by isolation and negative
pseudo-element stacking. This keeps the blue *inside* the ring only;
the single 2px border and existing 20px cyan glow remain unchanged.
No changes to Steam row geometry, hit areas, focus order, QAM,
TabMaster/UnifiedDeck, in-game menu or Non-Steam games. Stylesheet
revision **57** clears the previous CSS. Automated tests assert
transparent parent, inset fill, matching frame geometry and preserved
20px bloom. Final visual confirmation is still required on the MSI Claw.

**v0.4.21-test.5 — native Steam focus glow matched to dashboard rail
(device preview):** The v0.4.21-test.4 MSI Claw screenshots confirm the
double border is gone. The remaining Steam Home highlight looks too flat
because the single inset `::after` frame glows only 8 px, compared with
the dashboard sidebar's 20 px cyan bloom. Increase only that existing
frame's soft outer shadow to **20 px / rgba(3,157,255,.72)**, matching
the dashboard rail. Keep the existing focused-row gradient, one 2 px
inset cyan stroke, 4 px / 8 px inset geometry, and subtle inner glow.
No new solid line, extra row box shadow, margins or overflow changes.
QAM, theme panels, controller focus/navigation, TabMaster/UnifiedDeck and
game launching are unchanged. Revision **56** replaces cached native
CSS; automated checks cover border count, sidebar parity and ZIP CSS.
As always, the result must be visually checked on-device.

**v0.4.21-test.4 — one Steam menu focus border (device preview):**
The MSI Claw screenshot of v0.4.21-test.3 confirmed the Steam menu focus
frame now fits correctly, but revealed **two overlapping cyan outlines** on
the focused row. This release removes the native row's inset
`box-shadow` ring and its extra halo, leaving the existing **single
`::after` cyan border** (2 px, inset 4 px vertically / 8 px horizontally)
and its restrained glow intact. All menu row dimensions, labels, icons,
focus logic and background remain unchanged. QAM styles are untouched.
Native stylesheet revision **55** clears cached earlier CSS. Regression
tests and packaged-ZIP checks ensure the double ring does not return.
On-device visual confirmation is still required.

**v0.4.21-test.3 — repaired Steam menu focus clipping and QAM focus detection
(device preview):** The v0.4.21-test.2 MSI Claw photographs showed two
remaining issues: the native Steam button menu only displayed the left
portion of the focus rectangle, cutting off the top/bottom/right sides;
and QAM's Performance icon reverted to a default blue selected square
with no Midnight ring.

**Native Steam menu:** Target `.mainmenu_Item` directly rather than
requiring `#MainNavMenuContainer` as its ancestor; SteamOS may mount
the actual focusable rows elsewhere in its menu tree. Each row now
has **6 px vertical / 14 px horizontal margins** and a width that
accounts for the horizontal margin. The focused row gains a fully
*inset* cyan ring and a decorative, pointer-transparent
`::after` focus outline inset **4 px vertically and 8 px
horizontally**, preserving rounded corners without relying on an
external shadow that the Steam scroll viewport clips. Nonfocused active
pages keep their subdued background and no halo.

**Quick Access Menu:** Target the actual Steam
`.quickaccessmenu_Tab` icon directly, including when it is mounted
outside the expected `#QuickAccess-Menu .Tabs` ancestry. Widen both
the parent `.quickaccessmenu_Tabs` rail to **86 px** and the inner
`.quickaccessmenu_TabContentColumn` list to **74 px**, with contained
padding/margins. Both the **currently selected** section (even while
focus is inside its Performance/Decky panel) and an actually focused
icon show the cyan ring; the focused state has a brighter glow.
The CSS does not change the full QAM width or any plugin content-panel
geometry.

**Steam class name resolution:** The CSS alias expander now correctly
maps selector fragments with a terminal underscore, e.g.
`[class*="quickaccessmenu_Tab_"]`, to Steam's actual minified
`Tab` class, without accidentally targeting `TabContentColumn`.
This was an independent reason the QAM styling could fail on the
current client. The native CSS injection revision increases to **54**
so cached v0.4.21-test.2 styling is replaced.

Additional automated tests specifically validate Steam/QAM direct
class targets, clipped-edge-inset focus geometry, both native QAM
layout columns, selected-vs-focused QAM appearance, safe hash aliases,
and pointer transparency exclusively on the *decorative* Steam focus
pseudo-element. Packaging now inspects the actual ZIP contents for
the new native CSS fixes. All existing SteamOS volume/achievement
transparency, TabMaster/UnifiedDeck, game launch, layout, controller
input and prior theme tests remain active. A successful CI run **does
not prove the final on-device visual result**; please compare the
native Steam button menu and QAM on your MSI Claw.

**v0.4.21-test.2 — visible Steam menu and QAM controller-focus halos
(device preview):** Based on photographs from the MSI Claw, the original
Steam button's left menu highlighted the focused item with a flat blue
bar and a partly clipped cyan left edge, whereas our Game Library
sidebar showed a complete cyan outline and soft glow. The QAM icon
column was likewise too narrow for a visible focus halo.

This test build keeps Steam's original navigation and layout, but
adds **12 px horizontal gutters** around each native Steam menu item
(`#MainNavMenuContainer`, including Steam's `mainmenu_Item`
class) to make the complete **2 px inset cyan ring** plus external
glow visible. The item width is calculated to remain inside its
original panel. Controller and keyboard focus alone triggers this
highlight; an active/selected menu page without focus retains a subtle
background and no halo. Pointer hover by itself is not treated as
controller focus.

The native QAM **icon rail** (`quickaccessmenu_Tabs`) is expanded to
**86 px** with 8 px inner padding; icons use a 6 px side margin and
a width computed from available space so the cyan border and subtle
outside glow fit without cutting off the edges. The width change is
limited to the QAM icon rail, not the Quick Access root or Decky plugin
content panels. Focused icons use a 2 px inset cyan outline and
soft blue halo. Selected-but-unfocused QAM tabs keep the existing
narrow indicator without a persistent ring.

New `tests/menu-focus.mjs` regressions validate actual Steam main-menu
selectors, focus versus selection, QAM column geometry, non-invasive
scoping and retention of the transparent Game Mode/CEF overlay root.
Existing built-in theme CSS, controller input, TabMaster, launching and
Decky QAM tests still run. The native Steam CSS injection revision
increases from **52 to 53** to replace old cached styles safely.
**Visual confirmation remains required on the MSI Claw** — test the
Steam-button menu and Decky QAM with the controller, including checking
that cyan shadows are not clipped near the panel boundaries.

**v0.4.21-test.1 — Midnight styling for Steam running-game menu and
Steam Input controller layout (device preview):** This test release extends
Game Library's built-in Midnight CSS to two native SteamOS screens shown
while playing a game:

- **Steam button / running game menu:** The left navigation, game-action
  column and focusable items use the same Midnight navy surfaces, bright
  text and cyan focus accent as the Game Library sidebar. The vivid blue
  game-action panel becomes a dark blue gradient. Steam's running-game
  artwork, existing actions (Resume Game, Controller Settings, Achievements,
  Exit Game) and their controller navigation remain native.
- **Steam Input layout overview and configurator:** The page background,
  control labels, current-layout selection and action buttons adopt the
  Midnight palette. The controller diagram, SVG/button glyphs, mappings,
  controls' position and Steam Input behavior are untouched.

New `system-theme/running-menu.css` is bundled **only** into native
Steam's in-game-menu overlay scope; `system-theme/steam-input.css` is
bundled into **both** Game Mode and menu overlay scopes so either way of
opening the controller layout can be themed. Both stylesheets target
specific Steam UI component classes, never `.BasicUI`, the full
Steam/CEF root or transient volume/achievement surfaces. Hash/minified
CSS class-name aliases are resolved when those Steam UI modules load.
The hot-reload style marker is bumped to **52**, ensuring new CSS
replaces the prior version without a native-color flash.

The tests check CSS syntax/scoping, alias replacement, backend bundle
membership, non-invasive gamepad/controller layout, and ZIP inclusion
of both files; all existing Steam menu, TabMaster, QAM, library/navigation
and notification protections are retained. This is an explicitly
**on-device test build**: Valve may change native selectors between
SteamOS versions. In the first validation pass, open a game's Steam
button menu and Controller Settings → View Layout, then inspect the
menu's center panel, the controller-layout background and focus colors.
Do not treat a passing CI build as confirmation that both visual screens
are styled on the MSI Claw yet.

**v0.4.20 — live running-game shortcut at the top of the sidebar:** When
Steam Game Mode reports a running game through `SteamUIStore.RunningApps`,
Game Library inserts its game-art icon and title as the **first** sidebar
entry, before Home. The indicator disappears automatically when the game
exits. The shortcut resumes the already-running session via Steam's
`SetRunningApp` and `NavigateToRunningApp`; it **never launches** a new
instance. Both normal Steam app IDs and signed/unsigned 32-bit Non-Steam
shortcut IDs (including Epic/GOG shortcuts) are supported. When artwork is
available in the existing library catalog, the sidebar reuses its Steam
artwork; a controller icon is the fallback.

When the left rail expands, the title appears beside the icon; titles
longer than the available width run a gentle left-scrolling news-ticker
animation with pauses at both ends. Short titles remain stationary and
the animation honors the SteamOS reduced-motion preference. An in-session
detector checks every 1.6 seconds and again on Steam focus return.
The sidebar preserves logical controller focus if a running game appears
or disappears. Regression tests cover Steam games, Non-Steam shortcuts
with negative signed IDs, running state transitions, stale actions, safe
resume without relaunch, first-position rail ordering, ticker overflow,
and cleanup. The on-device SteamOS behavior still needs validation on
the MSI Claw (particularly Epic/GOG shortcuts).

**v0.4.19 — focus-only game cover highlights:** The main horizontal
carousel and the full-page game grid previously kept the blue outline
and glow around the *selected* game's poster even after controller
focus moved elsewhere. That happened because the renderer attached a
persistent `gl-selected` class whenever a game's details were shown,
and the Midnight CSS styled that class like a focus state.

The card's game-selection state is now independent of visual focus:
neither the selected poster nor ordinary inactive posters have a
border or glow. The existing white/cyan ring and slight lift apply
only when Decky's `gl-focused` class is present on the game card.
The `View More` tile also loses its permanent border, inset glow,
and focus-like mouse hover effect; its ring appears only with actual
controller/keyboard focus. Hero logo, selected-game information,
Play/Install actions, card sizes, grid navigation, TabMaster Auto
restoration, and Midnight SteamOS themes remain unchanged.

A new `tests/card-focus.mjs` regression suite checks that no
`gl-selected` styling survives, that both poster base rules and
the View More tile are borderless and glow-free, and that the
controller focus ring remains visible. GitHub CI checks these rules
together with the full build and other existing regression tests.
The on-device appearance still needs visual confirmation.

**v0.4.18 — automatic TabMaster restoration without reloading Game Library:**
The user verified that v0.4.17's native Steam fallback counts were correct,
but turning TabMaster and UnifiedDeck back on did not restore the saved custom
TabMaster tabs until manually refreshing Game Library in Decky. Previously the
six-second `loadSteamTabs()` polling effect belonged only to the
`Dashboard` React component, which can be temporarily unmounted or
suspended while the Decky plugin manager is in use.

Auto tab discovery now runs at the **plugin lifecycle level**, independent
of the dashboard route, with a four-second refresh and immediate checks
when returning from QAM/Steam menus via `focus`, `focusin`,
`pageshow` or `visibilitychange`. A second delayed check lets TabMaster
and UnifiedDeck populate their Steam collections shortly after enabling.
The asynchronous source refresh has an explicit active generation,
single-flight requests, stale-response rejection, and notification only
when tab definitions actually change. The dashboard subscribes to that
state; on real Steam-fallback ↔ TabMaster transitions it refreshes native
game data, selects the first available tab and resets stale carousel/grid
selection without restarting or reloading any Decky plugin.

The 0.4.17 native fallback `all-games`/`local-install`/Non-Steam
membership remains unchanged. No new source selector or plugin settings
are introduced: Auto is still the sole behavior. Runtime cleanup removes
timers and focus listeners on plugin dismount. Automated tests simulate
the real disable/enable transition while the dashboard is unmounted,
queued stale async responses, backend failures and focus/wake triggers;
the TypeScript build and existing navigation, Midnight, QAM and packaging
tests must pass before this release. The exact visual transition still
requires a final on-device check.

**v0.4.17 — actual native Steam tab membership (Claw diagnostics fix):**
The v0.4.16 on-device report gave decisive evidence: `type-games`
contains 785 titles, `all-games` has 464 actual Steam games,
`local-install` has 10 installed Steam titles, and 321 non-Steam
shortcuts all carry an `installed` overview flag. Our earlier fallback
used the overview boolean and falsely displayed 331 entries in the
Steam **Installed** tab (321 shortcuts + 10 installed Steam games).
It also included the 321 shortcuts in **All Games**, making the
first A–Z carousel items look nearly identical across tabs.

When TabMaster is unavailable, the built-in fallback now uses Steam's
actual collection memberships: `all-games` for **All Games**,
`local-install` for **Installed**, `favorite` for **Favorites**,
and verified non-Steam shortcuts for **Non-Steam**. Expected tab counts
from this particular device snapshot are therefore approximately
**464 / 10 / 0 / 321**, not the old 785 / 331 / 0 / 321.
The Favorites collection genuinely returned zero native entries in
the supplied diagnostics; this release does not invent favorites.
If native collections are unavailable on a different SteamOS build,
the fallback retains separate Steam vs non-Steam filtering using app
overviews instead of merging all shortcuts into Installed.

The on-device diagnostics now distinguish native **Steam All Games**
and **Steam Installed** counts from broader `installed` overview
flags. Regressions recreate exactly 464 Steam games, 10 native installed,
321 non-Steam games whose overview flags report installed, and an empty
favorite set; they verify the four native filters and fallback behavior.
All other Game Library layout, auto TabMaster detection, SteamOS theme,
QAM, controller navigation, and notification transparency remain
unchanged. CI verifies the implementation and packaging; a real
handheld check is still required to confirm the native UI result.

**v0.4.16 — on-device native library diagnostics (investigation build):**
After v0.4.15, the user confirmed that disabling TabMaster and UnifiedDeck
still yielded almost identical tiny game lists in All Games and Installed.
This release **does not claim to have fixed the catalog issue**. Instead it
provides a read-only instrument to identify what SteamOS is actually
returning to the Game Library dashboard, before changing any more filters.

Open `Decky → Game Library → Inspect Library Sources` to navigate to a
dedicated, gamepad-friendly Steam Game Mode diagnostics screen. It samples
the **same window** and calls the **same `getLibraryGames()` reader** as the
Game Library dashboard. The summary shows native candidate IDs vs.
actually displayable games, Installed / Favorites / Non-Steam counts,
availability of `collectionStore` and `appStore`, and how many of the
first 120 candidate IDs lack both a row title and a hydrated Steam app
overview. The detailed report splits `allApps`, `visibleApps` and
`apps` counts by native Steam collection and counts the exposed appStore
inventories (`GetAllApps`, `m_rgApps`, `m_rgAllApps`, `m_mapApps`,
`m_mapAppOverview`). The inspector never sends data to a server or
writes diagnostic data to the filesystem; `Copy report` copies only
aggregate counts and fixed source names, **not game titles, app IDs,
Steam account IDs, filenames or authentication material**.

Automated regression tests cover partial native inventory hydration,
missing Steam store objects, missing overview titles, report privacy,
and presence/cleanup of the Game Mode route and QAM entry. All
existing TabMaster Auto selection, Steam native theme, QAM styling,
volume/achievement transparency and game navigation remain unchanged.
A successful CI build only verifies implementation and simulated data.
**To investigate the real bug, run the inspector on the MSI Claw with
TabMaster/UnifiedDeck disabled and share both overview and detailed
counts.** The actual root cause cannot be declared until that report
is inspected.

**v0.4.15 — complete native Steam fallback library and correct tab
membership:** User-submitted MSI Claw recording exposed a real regression when
TabMaster and UnifiedDeck were disabled: the automatic fallback showed
almost the same small set under All Games and Installed, with Favorites
empty. Tab switching itself worked, but library indexing did not.

The original reader used `allApps ?? visibleApps ?? apps`. An **empty**
`allApps` is not null, so it silently ignored potentially populated
`visibleApps` and `apps` (including Steam's Favorite ID Set).
It also returned early as soon as ANY native collection supplied rows,
thus skipping the full appStore inventory of uninstalled and other games.
The corrected adapter unions all Steam collection representations and
the available `GetAllApps`, `m_rgApps`, `m_rgAllApps`, `m_mapApps` and
`m_mapAppOverview` sources, deduplicates canonical app IDs, and
prefers real Steam app overviews over bare numeric IDs.
Favorites and installed flags now use native collection membership as
well as properly evaluated boolean fields. A method object such as
`BIsInstalled` is no longer accidentally treated as `true`.
The four built-in fallback filters now share one tested implementation.
Switching tabs (both L1/R1 and activation) also refreshes the native
collection snapshot immediately rather than waiting up to 15 seconds.

The Auto policy from v0.4.14 stays unchanged: TabMaster tabs return
only while TabMaster is enabled. No SteamOS theme, controller focus,
network integration, volume/achievement overlay, or native game-launch
code is changed. The regression suite recreates incomplete Steam
collections, a Favorite collection where only `visibleApps` is populated,
additional uninstalled appStore games, ID-only entries, and mixed
Installed/Favorites/Non-Steam lists. Tests and TypeScript build pass,
but the real library counts still require validation on the MSI Claw.

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
