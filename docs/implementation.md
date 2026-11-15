# Implementation notes · initial scaffold

## Architecture

The project deliberately does **not** copy or fork the PS5 Dashboard repository.
Its Rollup/Decky setup follows the conventions of the owner's existing Claw Metrics codebase.

- **src/index.tsx** — Decky QAM entry; adds /game-library/dashboard preview route
- **src/Dashboard.tsx** — custom layout and controller-focus relationships
- **src/steam.ts** — guarded Steam client metadata adapter
- **src/theme.ts** — scoped CSS, no global Steam stylesheet mutation
- **src/tabmaster.ts** — read-only TabMaster tab definitions and supported filter mapping
- **src/UpdatesPanel.tsx** — GitHub version checker and Decky-managed installer with confirmation
- **main.py** — read-only TabMaster settings bridge and release validation endpoints
- **updates.py** — pinned GitHub repository and SHA-256 asset validation

## Layout at 1280×800

- Persistent icon rail at the left; icons stay visible.
- Label appears only beside an icon with keyboard/gamepad/mouse focus.
- Horizontal carousel uses portrait art from the user's Steam library.
- Details and selected-game hero are beneath the carousel.
- The footer summarizes controller actions.

## Navigation

- When the **first game** receives D-pad Left, focus is transferred to the rail.
- In the rail, D-pad Up/Down explicitly moves focus between icons; D-pad Right or B returns to the first game.
- D-pad Up on a game card enters the TabMaster tab bar; Left/Right navigates tabs and Down returns to games.
- Press A to activate an icon or play a game.
- Bumper mappings and QAM must continue using Steam's own shortcuts.
- The custom dashboard launches from the Decky panel; original Steam Home is not replaced.

## Known limitations before device testing

1. Steam library metadata and launch APIs are internal and can differ between SteamOS versions.
   The adapter uses guarded reads; if a client exposes no supported source, a fallback to Steam's
   built-in Library is shown rather than invented game data.
2. Favorite status and achievements are shown only when available.
   Steam cloud sync state is **not fabricated**.
3. Non-Steam artwork uses Steam's custom art where available, otherwise a fallback tile.
4. The descriptive store text for each game is not available from the base overview API.
5. Controller event ordering must be tested on a real Decky/SteamOS build;
   successful TypeScript compilation does not validate focus routing.
6. No automatic replacement of /library/home until safe navigation has been verified.
7. TabMaster integration requires access to the active user's saved TabMaster settings. Complex filter types are not silently approximated; the native library remains available.
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
For installation, package plugin.json, main.py, updates.py, dist/index.js and any Decky-generated assets
using the conventional Decky Loader plugin folder/ZIP layout.
