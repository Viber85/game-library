# Implementation notes · initial scaffold

## Architecture

The project deliberately does **not** copy or fork the PS5 Dashboard repository.
Its Rollup/Decky setup follows the conventions of the owner's existing Claw Metrics codebase.

- **src/index.tsx** — Decky QAM entry; adds /game-library/dashboard preview route
- **src/Dashboard.tsx** — custom layout and controller-focus relationships
- **src/steam.ts** — guarded Steam client metadata adapter
- **src/theme.ts** — scoped CSS, no global Steam stylesheet mutation
- **main.py** — no-op frontend-only backend placeholder

## Layout at 1280×800

- Persistent icon rail at the left; icons stay visible.
- Label appears only beside an icon with keyboard/gamepad/mouse focus.
- Horizontal carousel uses portrait art from the user's Steam library.
- Details and selected-game hero are beneath the carousel.
- The footer summarizes controller actions.

## Navigation

- When the **first game** receives D-pad Left, focus is transferred to the rail.
- In the rail, D-pad Up/Down changes action; D-pad Right or B returns to the first game.
- Press A to activate an icon or play a game.
- Bumper mappings and QAM must continue using Steam's own shortcuts.
- The custom dashboard launches from the Decky panel; original Steam Home is not replaced.

## Known limitations before device testing

1. Steam library metadata and launch APIs are internal and can differ between SteamOS versions.
   The adapter uses guarded reads; if a client exposes no supported source, a fallback to Steam's
   built-in Library is shown rather than invented game data.
2. Favorite status and achievements are shown only when available.
   Steam cloud sync state is **not fabricated**.
3. Non-Steam game artwork requires a separate art provider; fallback tile is used for now.
4. The descriptive store text for each game is not available from the base overview API.
5. Controller event ordering must be tested on a real Decky/SteamOS build;
   successful TypeScript compilation does not validate focus routing.
6. No automatic replacement of /library/home until safe navigation has been verified.

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
For installation, package plugin.json, main.py, dist/index.js and any Decky-generated assets
using the conventional Decky Loader plugin folder/ZIP layout.
