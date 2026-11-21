# Game Library v0.6.5 — Complete directional controller navigation

## Fixed
- **Tab Manager:** Up, Down, Left and Right on wrapped action rows,
  cross-row creation controls, and the selected tab list. This fixes
  the right-panel trap where Up/Down worked but Left/Right did not.
- **Manual game picker:** Horizontal navigation across the Cancel,
  Save and Selected Only controls while retaining vertical navigation
  among games and the search field.
- **Smart Rules editor:** Directional focus throughout the header,
  AND/OR toggle, condition rows, Remove controls, Add condition, Save
  and Cancel. The expanded two-column condition selector also supports
  both axes.
- **Appearance / Theme Hub:** Midnight and Steam Default sit side-by-
  side; Left/Right navigates between them, Up returns to Theme.
- **Plugin Settings:** Right enters Tab Manager, SteamGridDB, Updates
  or Library Diagnostics. Left returns to the sidebar. Native Decky
  provider panels retain their existing controls and Back behavior.
- **Search:** text field Up/Down to navigation/filters, clear button
  4-way focus, and explicit Sort/Back navigation.
- **Collections:** picker text field Up/Down, clearer Back -> search
  and rightward navigation to collection contents.
- **Home and Library:** carousel Down moves to Play / Game Details;
  their Left/Right focuses adjacent actions. Search results and full
  Library header actions now have explicit directions.

## Architecture
- New `src/spatialFocus.ts` implements one shared, deterministic focus
  calculation from actual element rectangles. It will not jump right
  into a button on the next row or focus invisible/disabled controls.
- D-pad and left analogue remain handled by Decky's existing
  `GamepadButton.DIR_*` focus events; buttons are not activated by
  directional input unless the action is a standard Settings submenu.
- While editing search or tab names, Left/Right remains usable to move
  the text cursor. Only Up/Down leaves the text field.
- No changes to stored tabs, Smart filters, metadata, artwork, CSS
  of native Steam settings, game launch data, or other Decky plugins.

## Verification
- New `tests/spatial-navigation.mjs` tests horizontal/vertical
  neighbors across flex-wrapped rows, two-column grids, invisible
  controls, edge clamping and menu event coverage.
- Existing search, collections, Home, theme, and release audits run
  through the full GitHub Actions typecheck/build/test pipeline.

## Real device checks (required)
1. Settings > Tab Manager > select All Games or a custom tab.
2. Focus Rename and press LEFT repeatedly: Rename -> Hide ->
   Move down -> Move up; press RIGHT to retrace.
3. Press DOWN from each action row to the next visible row and
   verify UP returns to the appropriate nearest control.
4. Focus the Tab name field; press UP/DOWN to leave it and verify
   LEFT/RIGHT still move the text caret while editing.
5. Create a Manual tab, open its game picker, test horizontal
   Cancel/Save selection and vertical game rows.
6. Open a Smart tab, enter Edit Smart Rules and the two-column
   condition picker. Verify all 4 directions.
7. Check Theme Hub, Settings > SteamGridDB, Updates, Search,
   Collections, the Library grid, and Home Play / Details.
8. Confirm D-pad **and left analogue** work on the handheld.

GitHub Actions success verifies static/automated checks. The real
SteamOS/Decky input event chain cannot be validated remotely; report
any remaining directional focus trap with the focused control and
direction so we can address it precisely.
