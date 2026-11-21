# Game Library v0.6.7 — Diagnostics and My Collections controller navigation

This update fixes the last two known menus with incomplete four-direction
D-pad / left-analogue navigation. Version 0.6.6 remains the foundation.

## Fixes

- **Settings → Library Diagnostics**
  - Refresh, Copy report and Back are navigable left/right with explicit
    GamepadButton handlers.
  - Up/down moves from the toolbar into two focusable report panels.
  - Left/right switches between report panels; up returns to the toolbar,
    while up/down scrolls the focused report as needed.
  - Uses actual Steam native gamepad focus transfer rather than relying
    on HTML focus alone.
- **Collections → My Collections**
  - Each custom collection row uses supported Decky
    `Focusable.onButtonDown` and native focus transfer.
  - Up/down selects adjacent groups, up from the first returns to Back,
    right enters the selected collection, left returns to navigation.
  - The selected collection's grid uses native focus when moving cards.
- The native menu focus bridge recognizes Diagnostics report panels
  and deliberately does not intercept Right on a collection group:
  the group's own rightward action opens that collection.
- Home, Library and Search navigation, as well as stored tabs, metadata,
  games, styling and update/SteamGridDB integration are unchanged.

## Permanent regression requirement

All future custom Game Library menus must support **Up, Down, Left and
Right through both the D-pad and left analogue**. The continuous
integration test `tests/native-gamepad-focus.mjs` verifies four-direction
handlers in Diagnostics and My Collections and checks the focus contracts
of Tab Manager, Smart Rules, Settings and Appearance. Check this
contract on any new or substantially changed screen.

## On-device verification

1. Open **Settings → Library Diagnostics**. Focus Refresh.
   Right: Copy report → Back; Left: Copy report → Refresh.
2. From Refresh, Down enters the overview panel.
   Right enters the detailed report. Up returns to the toolbar.
3. Open **Collections → My Collections**.
   Up/Down selects adjacent custom tabs.
   Right opens a tab; Left returns to the sidebar; B returns to the list.
4. Open a collection containing games and check D-pad + analogue on
   the game grid.
5. Quickly check Tab Manager, Settings, Appearance and Smart Rules again
   to confirm existing navigation still works.

Automated build and tests verify code and expected focus routing;
real Decky input behavior still requires a test on handheld hardware.
