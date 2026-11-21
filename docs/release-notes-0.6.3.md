# Game Library v0.6.3 — Navigation cleanup

Game Library keeps the same native Library, Smart Tabs, Manual Tabs,
filters, artwork, metadata and saved user selections, but simplifies the
left navigation.

## Changes
- **Tab Manager** is no longer a standalone left navigation icon.
  Open **Settings > Tab Manager** to manage all existing tabs.
- The Tab Manager still opens the same controller/touch-friendly editor
  and retains Manual game selection, Smart rules and per-user storage.
  B / Back returns from Tab Manager to Plugin Settings. Returning to
  Settings restores focus to the Tab Manager entry.
- **Appearance** stays a dedicated left navigation entry, with
  themes, artwork and plugin updates in that page. Duplicate Appearance
  and Update shortcuts were removed from Plugin Settings.
- The Midnight theme toggle was removed from Plugin Settings to
  avoid duplicating the existing theme controls in Appearance.
- Plugin Settings now contains **Use as Steam Home**,
  **Tab Manager** and **Library diagnostics**, with existing QAM
  settings still available.

## Handheld checks
1. Install v0.6.3, open left rail and confirm there is no separate
   Tab Manager icon; Appearance and Settings remain visible.
2. Enter Settings > Tab Manager; confirm existing custom Manual and
   Smart tabs and saved games are still present.
3. Use B / Back from Tab Manager; Settings should reopen and focus
   its Tab Manager row.
4. Navigate from Settings to Appearance using the left rail; theme,
   artwork and update options must be available there.
5. Check Home toggle, L1/R1 Library tabs, controller focus and
   Steam game details remain functional.

CI covers typechecking, build and existing navigation tests.
Actual on-device controller and touch testing remains necessary.
