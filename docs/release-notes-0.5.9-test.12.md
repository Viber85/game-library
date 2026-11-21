Game Library v0.5.9-test.12 — Fast Jump to Letter (Phase 2)

NEW — Dedicated Library full grid, A–Z or Z–A only:
- The existing right-side A–Z position rail is now a controller-focusable
  alphabet picker. Press D-pad/right analog RIGHT on the last poster in a
  row to enter the alphabet rail.
- D-pad/left analog UP and DOWN scroll through letters that actually have
  games in the active Library tab. Missing letters remain dimmed and are
  skipped (no wrap at the ends).
- Press A to jump directly to the first game under the highlighted letter,
  in the current sort direction, and focus its cover.
- Press LEFT or B to return to the exact poster that originally entered
  the rail, without moving the game grid.
- Handles distant letters (beyond 60 initially mounted cards) using the
  existing progressive grid loading and pending-focus system.
- LB/RB keep switching Library tabs; Y still opens the native plugin Sort
  menu. The other game controller actions are preserved.
- A–Z rail remains visible exactly as in Phase 1 and the large floating
  letter remains visible briefly after each letter transition.
- Only active in the full Library grid on A–Z / Z–A sorting; Home, Search,
  Collections and other sorts are unchanged.
- No network calls, additional metadata work, HLTB changes, persistent
  preferences, or runtime polling.

TEST IN GAME MODE
1. Library > All Games > A–Z. At a row's last cover, press RIGHT.
2. Check the rail focus outline, select another populated letter with
   UP/DOWN, press A, and confirm the first matching poster is focused.
3. Repeat for a letter beyond the first 60 covers.
4. Open again, press LEFT and then B in separate attempts; focus should
   return to the original poster without scrolling elsewhere.
5. Verify LB/RB tab switching, Y sort, gamepad analog, and Z–A behavior.
6. With sorting Recently Played or in Home, no A–Z picker should appear.

