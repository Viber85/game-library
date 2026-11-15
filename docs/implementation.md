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
- **src/tabmaster.ts** and **src/steam.ts** — ID/name mapping for Unifideck `[Unifideck] Epic/GOG` collections
- **src/index.tsx** — optional /library/home patch with React error fallback and stored preference
- **src/tabmaster.ts** — read-only TabMaster tab definitions and supported filter mapping
- **src/UpdatesPanel.tsx** — GitHub version checker and Decky-managed installer with confirmation
- **main.py** — read-only TabMaster settings bridge and release validation endpoints
- **updates.py** — pinned GitHub repository and SHA-256 asset validation

## Layout at 1280×800

- Persistent icon rail at the left; icons stay visible.
- Label appears only beside an icon with keyboard/gamepad/mouse focus.
- Horizontal carousel uses portrait art from the user's Steam library.
- Details and selected-game hero are beneath the carousel. The carousel shows 15 games plus a View More tile. View More reveals a full, controller-navigable game grid with progressive rendering (60 at a time). User-selected Steam title logo appears above the name, and HowLongToBeat duration statistics appear beside Steam playtime.
- The footer summarizes controller actions.

## Navigation

- When the **first game** receives D-pad Left, focus is transferred to the rail.
- In the rail, D-pad Up/Down explicitly moves focus between icons; D-pad Right or B returns to the first game.
- View More: bounded D-pad navigation across a multi-column grid; Left/Right never wraps or escapes to the side rail; Up/Down follow actual rendered column geometry; newly rendered cards retain pending focus. A opens game details and B returns to the main carousel. L1/R1 switches TabMaster tabs.
- D-pad Up on a game card enters the TabMaster tab bar; Left/Right navigates tabs and Down returns to games.
- Press A to activate an icon or play a game.
- Bumper mappings and QAM must continue using Steam's own shortcuts.
- The custom dashboard launches manually from Decky and is also the default view for Steam Home after Decky loads. Turn **Use as Steam Home** off to remove the patch and show native Home again.

## Known limitations before device testing

1. Steam library metadata and launch APIs are internal and can differ between SteamOS versions.
   The adapter uses guarded reads; if a client exposes no supported source, a fallback to Steam's
   built-in Library is shown rather than invented game data.
2. Favorite status and achievements are shown only when available.
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

## Build / package

Run npm install, npm run typecheck, npm run build.
For installation, package plugin.json, main.py, updates.py, hltb.py, protondb.py, dist/index.js and any Decky-generated assets
using the conventional Decky Loader plugin folder/ZIP layout.
