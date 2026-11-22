# Game Library v0.6.11-test.31 — Always open Steam Store/HLTB in the main GamepadUI window

## Reproduced user behavior

v0.6.11-test.30 gave Game Details its own native Steam route, yet:
- **Steam Store → B** still returned to the old **Controller Settings**, where navigation got stuck.
- **HLTB details → B** returned to Game Details but flashed Controller Settings for about one second.

The user confirmed that actual Controller Settings page, its own B return, and directional focus to/from the left rail work; these must remain intact.

## Root cause found in Decky navigation source

The Decky frontend's `Navigation.NavigateToSteamWeb` and `Navigation.NavigateToExternalWeb` resolve **`SteamUIStore.GetFocusedWindowInstance()` first**. Only if no window is focused do they use `WindowStore.GamepadUIMainWindowInstance`. After closing the separate Steam Controller Settings page, its window can remain the Steam-**focused** instance even though our Game Details is rendered in the main gamepad window. As a result Store/HLTB was pushed onto the controller window's SteamWeb/ExternalWeb history. B then legitimately returned to Controller Settings, with a flash before one of our fallback return snapshots restored Game Details.

Source: `SteamDeckHomebrew/decky-frontend-lib/src/modules/Router.ts` `createNavigationFunction`. Verified SteamUI store APIs: `SteamDeckHomebrew/decky-frontend-lib/src/globals/stores/steamuistore/window.ts` (`GamepadUIMainWindowInstance`, `m_Navigator.SteamWeb`, `m_Navigator.ExternalWeb`, `m_locationPathname`).

## Fix

On custom Game Details **dedicated route** only:
1. Call the actual main Game Mode Steam UI navigator `SteamUIStore.WindowStore.GamepadUIMainWindowInstance.m_Navigator` explicitly, not Decky's focused-window navigation helper.
2. Send **HLTB** URL via `main.m_Navigator.ExternalWeb(url)` and the verified Steam Store `steam://store/<AppID>` via `main.m_Navigator.SteamWeb(url)`.
3. If the main Game Mode window is absent, doesn't expose the required method, or is on a different known route than `/game-library/game-details`, **fail closed with a toast** rather than silently sending navigation into a stale Controller Settings window.
4. Preserve native navigator's `this` binding. Do not manipulate Steam browser global history, inject CSS or patch Controller Settings.
5. The existing legacy transient-view branch remains for older in-flight sessions; new Home/Library/Collections/Search game selections use the dedicated route and the fixed main-window dispatch.

## Regression coverage

New `tests/main-gamepad-browser.mjs` creates separate simulated instances:
- Main GamepadUI on custom Details.
- An old Controller Settings window reported as **focused**.

It asserts Store/HLTB URLs go **only** to the main Steam navigator, never to the focused controller window. Further tests check matching Game Details route, unavailable APIs, navigator `this` binding, and no accidental fallback to Decky's generic focused-window functions. All existing controller, Library, Home, D-pad, HLTB/Store targets and Game Details tests remain enabled.

## MSI Claw test

1. Open a native Steam game → our Game Details → Controller Settings → B to return.
2. **Steam Store → B** should return to Game Details (not Controller Settings).
3. **HLTB details → B** should return to Game Details without a Controller Settings flash.
4. B from Game Details should return to original Library/Home screen. Side rail left/right, gear/Start menu and Controller Settings should remain correct.
5. If a button displays **Cannot open HowLongToBeat / Steam Store**, this is intentional instead of incorrectly opening the controller-window browser. Record the message and the selected game.

CI verifies the window-selection dispatch and build, but actual SteamOS window focus and native browser transition animation require the user's on-device confirmation.
