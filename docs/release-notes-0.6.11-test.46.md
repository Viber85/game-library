# Game Library v0.6.11-test.46 — GOG four-way Game Mode navigation

## MSI Claw feedback
GOG Game Details opened and the new SteamGridDB hero image loaded, but
controller D-pad navigation did not move among the four sections or return
to the Game Library sidebar.

## Root cause
The Steam Game Details component already uses native Steam `BTakeFocus`
for directional navigation and initial focus takeover from the hidden
Library grid. The GOG Details component only called
`HTMLElement.focus()` on Back. Moreover, Dashboard only activated its
`vgp_ondirection` capture bridge for **Steam** Game Details, so the
controller remained attached to the grid or could not traverse GOG controls.

## Fix
- GOG Details now owns a native focus root and control refs; its Back button
  and Activity / Your Stuff / Community / Game Info tabs use the SAME
  geometric next-control algorithm and Steam native focus transfer as
  Steam Game Details.
- The first paint transfers Steam controller focus into the GOG Back button.
  A single delayed retry handles Game Mode's navigation tree registration.
- Every directional event is consumed by the GOG page before the hidden
  Library route can navigate, and native directional focus is used rather
  than browser focus alone.
- LEFT from the edge moves to the sidebar, RIGHT from the sidebar moves
  back into GOG Details, UP/DOWN and LEFT/RIGHT navigate between visible
  focusable page controls.
- Dashboard's native gamepad bridge is active for **either** Steam or GOG
  Details. Removing GOG Details returns native focus to the originating
  card on the main library (existing full-grid/search focus is preserved).
- The disabled GOG Install placeholder remains non-interactive until the
  separate `gogdl` installer exists.
- Hero, ProtonDB, HLTB, and all Steam game download features are unchanged.

## MSI Claw tests
1. Open a GOG game. Focus should appear on **Back to Library**, without
   first touching the touchscreen.
2. Press DOWN to **Activity**, RIGHT through **Your Stuff, Community,
   Game Info**, and LEFT back through the tabs.
3. Press UP to return to Back; press LEFT at the edge to reach the sidebar;
   press RIGHT on the sidebar to re-enter GOG Details.
4. Press B to return to the prior card and reopen the same GOG title.
5. Verify the Steam game details navigation and native install/cancel
   workflow remain unchanged.

Automated tests verify four-way geometry and native focus wiring, but
controller navigation on the physical MSI Claw still needs confirmation.
