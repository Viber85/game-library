# Implementation notes · initial scaffold

## Architecture

The project deliberately does **not** copy or fork the PS5 Dashboard repository.
Its Rollup/Decky setup follows the conventions of the owner's existing Claw Metrics codebase.

- **src/index.tsx** — Decky QAM entry; adds /game-library/dashboard preview route
- **src/Dashboard.tsx** — custom layout and controller-focus relationships
- **src/steam.ts** — guarded Steam client metadata adapter
- **src/theme.ts** — scoped CSS, no global Steam stylesheet mutation
- **src/HltbCard.tsx** — on-demand HowLongToBeat statistics for the selected game
- **hltb.py** — direct website search, result matching and disk caching
- **protondb.py** — direct ProtonDB summary tier lookups, guarded Steam Store name-to-AppID resolution for Epic/GOG shortcuts, local caches, match validation
- **src/ProtonDBBadge.tsx** — community compatibility badge above Installed
- **src/AchievementsCard.tsx / src/achievements.ts** — live achievement counts from Steam client, native details fallback, trophy and progress bar
- **src/tabmaster.ts** and **src/steam.ts** — ID/name mapping for Unifideck `[Unifideck] Epic/GOG` collections
- **src/index.tsx** — optional /library/home patch with React error fallback and stored preference
- **src/tabmaster.ts** — read-only TabMaster tab definitions and supported filter mapping
- **src/UpdatesPanel.tsx** — GitHub version checker and Decky-managed installer with confirmation
- **system-theme/*.css** — bundled Midnight color sheets (no CSS Loader manifest or dependency)
- **src/themeTabs.ts** — allowlist for Steam main Game Mode and QAM/Menu browser tabs
- **system-theme/settings.css** — correct PagedSettingsDialog structure, categories, unfocused setting rows and dropdowns
- **system-theme/game-details.css** — native Steam game detail page (playbar, game statistics, Activity, tabs and cards; artwork untouched)
- **src/themeClassAliases.ts + src/themeCssCompiler.ts** — map Steam's live CSS-module classes to readable selectors via Decky findClassModule; handle minified classes and lazy-loaded pages
- **src/builtinThemeRuntime.ts** — Decky-native CSS injection/recovery/removal across Steam UI tabs
- **src/themeController.ts** — persistent Midnight/Off theme selection, default Midnight
- **src/BuiltinThemePanel.tsx** — built-in Appearance toggle and active-window diagnostics
- **src/launchGame.ts** — 64-bit validated Steam gameID for Non-Steam shortcuts (signed/unsigned appStore probing), RunGame default option (-1)
- **main.py** — read-only TabMaster settings bridge and release validation endpoints
- **updates.py** — pinned GitHub repository and SHA-256 asset validation

## System-wide appearance — integrated

- Midnight is the **default** Game Library theme, independently of CSS Loader.
- The native Decky API injects stylesheet strings into each Steam UI window,
  with a distinct CSS bundle for the main Game Mode and overlay menus.
- CSS injection uses a revisioned ownership marker and is replaced on upgrade;
  if a lazily loaded Steam page exposes new minified CSS classes, the plugin
  recompiles its stylesheet from the actual Steam class module registry.
- Tab discovery uses the Steam CEF debug-tab listing; supported targets are
  explicit: Steam Big Picture/SharedJSContext plus QuickAccess/MainMenu windows.
  The runtime retries injection when tabs appear or reload.
- Palette: `#020815` / `#0C1B32` / `#4AC1FF`.
- User can disable it via Game Library → Appearance; managed styles are removed.
  The preference is saved alongside (without overwriting) the Steam Home setting.
- Theme registry supports future IDs. Currently `midnight` and `off`.
- No third-party theming app, CSS Loader theme directory, or CSS Loader settings
  are read or modified.
- Changing color values does not replace buttons, Steam routes or controller
  focus logic.

## Layout at 1280×800

- Persistent icon rail at the left; icons stay visible.
- Label appears only beside an icon with keyboard/gamepad/mouse focus.
- Horizontal carousel uses portrait art from the user's Steam library.
- Details are beneath the carousel; the selected-game hero is a full-height background behind both the carousel and details, with a left gradient for legible metadata. The carousel shows 15 games plus a View More tile. View More reveals a full, controller-navigable game grid with progressive rendering (60 at a time). User-selected Steam title logo appears above the name, and HowLongToBeat duration statistics appear beside Steam playtime.
- The footer summarizes controller actions.

## Navigation

- When the **first game** receives D-pad Left, focus is transferred to the rail.
- In the rail, D-pad Up/Down explicitly moves focus between icons; D-pad Right or B returns to the first game.
- View More: bounded D-pad navigation across a multi-column grid; Left enters the side rail only from the actual first column; Right/B returns to the same grid game; Up/Down follow actual rendered column geometry; newly rendered cards retain pending focus. A opens game details and B returns to the main carousel. L1/R1 switches TabMaster tabs.
- D-pad Up on a game card enters the TabMaster tab bar; Left/Right navigates tabs and Down returns to games.
- Press A to activate an icon or play a game.
- Bumper mappings and QAM must continue using Steam's own shortcuts.
- The custom dashboard launches manually from Decky and is also the default view for Steam Home after Decky loads. Turn **Use as Steam Home** off to remove the patch and show native Home again.

## Known limitations before device testing

1. Steam library metadata and launch APIs are internal and can differ between SteamOS versions.
   The adapter uses guarded reads; if a client exposes no supported source, a fallback to Steam's
   built-in Library is shown rather than invented game data.
2. Favorite status and achievements are shown only when available; achievements are fetched for the selected Steam game from GetMyAchievementsForApp, with native app details fallback.
   Steam cloud sync state is **not fabricated**.
3. Non-Steam artwork uses Steam's custom art where available, otherwise a fallback tile.
4. The descriptive store text for each game is not available from the base overview API.
5. Controller event ordering, home-route boot interception and HLTB website lookup must be tested on a real Decky/SteamOS build;
   successful TypeScript compilation does not validate focus routing.
6. The Home route is patched only while Use as Steam Home is enabled. A React error boundary restores Steam's original Home if rendering fails; other plugins patching the same route may still conflict.
7. TabMaster integration requires access to the active user's saved TabMaster settings. Complex filter types are not silently approximated; the native library remains available. Epic/GOG resolve exact Unifideck collection membership (including regenerated IDs).
8. The GitHub repository is public. Updater module discovery uses an explicit local-file import because Decky does not guarantee the plugin directory is on Python's module search path. Installed versions older than v0.2.0-test.4 may need one manual ZIP update.

## Tests to run on a handheld

- Start via Quick Access > Decky > Game Library > Open Dashboard.
- A/B focus and activation across all filters and game tiles.
- Left from first tile focuses rail, left from any other tile goes to previous game.
- Rail Up/Down focus; Right and B return to first game.
- Return after Steam Store, Settings, Downloads, and Power.
- Missing metadata / missing cover art / large game collections.
- At least 1280×800 and other handheld resolutions.
- SteamOS updates and absence/presence of other theme plugins.
- Launch an installed native Linux AppImage and Flatpak from the custom dashboard; verify it matches native Steam Play.
- Select a Steam game with achievements already earned, verify the acquired count and percentage against native Steam.

## Build / package

Run npm install, npm run typecheck, npm run build.
For installation, package plugin.json, main.py, updates.py, hltb.py, protondb.py, dist/index.js and any Decky-generated assets
using the conventional Decky Loader plugin folder/ZIP layout.
