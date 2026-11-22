# Game Library v0.6.11-test.30 — Fix Store/HLTB Back history at the route level

## Reproduced on MSI Claw

In v0.6.11-test.29:
- Game Details → **Steam Store** correctly opened the chosen game's Store page, but B went to the *old Controller Settings* screen and got stuck.
- Game Details → **HLTB details** → B eventually returned to our Game Details, but the *old Controller Settings* screen flashed for about a second.
- Controller Settings itself, the gear/Start game menu, left-rail D-pad/analog navigation and Game Details appearance all worked and should not be changed.

## Root cause

Our custom Game Details was **React state inside the Library/Home route**, not a Steam Game Mode history entry. We had separately added single-use return tokens for Controller Settings, HLTB and Store, but those tokens can only reconstruct our screen **after** Steam traverses its previous native history. An earlier `/app/<appid>/controllerconfigurator/main` entry remained in that history, causing the observed flash/stuck behavior. Opening URLs with another native browser did not remove this history entry.

## Structural fix

- Register one dedicated native Game Mode route: `/game-library/game-details`.
- Opening Game Details from Home, Library, Search or Collections stages a small, validated, in-memory session (actual Steam app, source route, source view, selected card/grid index and scroll offset), saves the original Library tab and navigates **once to this real route**.
- The *same existing* Game Details React component, shared Midnight CSS, HLTB data and D-pad/analog/left-rail focus run on the registered route.
- **Controller Settings, HLTB and Steam Store** open on top of that dedicated route, without arming additional web/controller return tokens. Native Steam B can now return straight to Game Details because it is an actual prior route rather than only a React state restored inside Library.
- Pressing B **from Game Details itself** calls `Navigation.NavigateBack()`, popping to the actual prior Home/Library/Search/Collections route. The saved origin snapshot restores the selected tab, game and scroll position.
- Session is memory-only, validated against known source routes, and expires after an hour. Invalid app IDs and stale/incorrect origins do not activate Game Details.
- The previous return-token code is kept as legacy compatibility for earlier in-flight native sessions but is not used by the new dedicated Game Details route.

## Unchanged

No new CSS, no controller layout changes, no HLTB statistics changes, no Steam Store link changes, no game installation changes, no edit to native Steam Game Details. The working Controller Settings page and gear game context menu remain unchanged. Previous automatic Home startup behavior stays enabled.

## Tests

- New dedicated route/session regression suite checks registration and removal, correct per-game session, invalid/stale state, one-step B return, and no overlapping legacy return tokens for Store/HLTB/Controller Settings.
- Full existing navigation, focus, Controller Settings, Home/Library/Collections/Search and release-audit test suites remain enabled and pass.
- GitHub CI builds and packages the installable ZIP. Actual Steam browser animation/back-stack behavior requires the user's MSI Claw test.

## MSI Claw verification

1. Library → game → our Game Details → **Controller Settings** → B; should return directly to the same Game Details.
2. Game Details → **Steam Store** → B; should return directly to Game Details, with no Controller Settings page.
3. Game Details → **HLTB details** → B; should return directly to Game Details, with no brief Controller Settings flash.
4. B again from Game Details; should return to the original Library list, tab and selected game.
5. Repeat from Home if useful. D-pad LEFT/RIGHT must still reach the sidebar; cog remains the Start-equivalent game menu.

If SteamOS still displays Controller Settings before the dedicated route, capture the sequence and current route rather than adding another speculative native browser API.
