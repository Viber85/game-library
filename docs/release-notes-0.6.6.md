# Game Library 0.6.6 — Native Gamepad Focus Fix

## Root cause
Earlier versions used `HTMLElement.focus()` to move between our custom
Focusable controls. SteamOS Game Mode has a separate navigation/focus tree,
so the ordinary browser focus could change without moving the actual
controller highlight. This explains why UI geometry tests passed while
D-pad Left/Right failed on a handheld.

## Changed
- Subscribe in **capture phase** to Steam's native
  `vgp_ondirection` input event while custom menu routes are mounted.
- Find the intended neighbor from our actual visible button rectangles,
  then request focus through Steam's navigation tree via
  `getGamepadNavigationTrees()` and `BTakeFocus(0, direction)`.
- Intercept the direction event only after Steam confirms it accepted
  the destination. Otherwise leave native behavior unchanged.
- Support the Tab Manager list and action panel, Manual picker, Smart
  Rules, Appearance themes, Plugin Settings (SteamGridDB and Updates),
  Collections and Library Diagnostics.
- Handle transitions from the left navigation rail into custom menu
  content and back using native gamepad focus.
- Do **not** install this listener on Home, Library or Search. Their
  previously working controller paths remain untouched.
- Preserve LEFT/RIGHT text-caret navigation in editable input fields.
- Unsubscribe on unmount, avoid interfering with other Decky plugins or
  native Steam menus.

## Verification
- New `nativeGamepadFocusCore.ts` uses the same public Steam Decky
  navigation-tree API exposed by Decky's UI module.
- New tests verify a simulated `BTakeFocus` call, correct source and
  direction, cross-document safety, hidden/disabled target exclusion
  and registration restricted to the affected Game Library routes.
- Entire existing frontend, backend, theme, sorting and packaging
  test suites must pass prior to publishing the ZIP.
- Real handheld SteamOS testing is still necessary because simulated
  tests cannot fully reproduce Steam's proprietary focus tree.

## On-device checks
1. Open **Settings > Tab Manager**, select All Games, focus Rename.
2. Press **D-pad Left** three times. Focus should traverse Hide,
   Move Down, Move Up. Then press Right to traverse back.
3. Repeat with the **left analogue**.
4. Check Down and Up to enter/leave the tab name and creation row.
5. Enter Smart Rules, Manual game selection, Appearance, Collections,
   and Settings > SteamGridDB/Updates. Confirm all four directions.
6. Verify Home, Library and Search behave exactly as before.

If an affected menu still refuses Left/Right after this version, report
the menu, focused control and direction. Unlike previous patches, this
one changes the Steam controller-focus mechanism itself.
