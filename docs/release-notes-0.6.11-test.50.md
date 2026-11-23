# Game Library v0.6.11-test.50 — installation-first Steam and GOG Game Details

## Design based on approved MSI Claw reference

Steam and GOG use the same Game Details layout:
- Big 2:3 portrait cover beneath the hero. Native / SteamGridDB artwork and existing GOG fallback rules remain intact.
- A single group of three metadata cards next to the cover: **Space Required**, **Last Played**, **Achievements**. Missing values remain unknown; GOG achievements are not invented.
- Primary Install/Play button and provider-specific actions immediately below the cards.
- Fixed-height space **below the action buttons** reserved for native Steam download progress, transfer bytes / time and Pause / Resume / Cancel. The reserved region exists before, during and after download, so it does not move the cover, controls or the HLTB row. Long diagnostic feedback can scroll inside that region.
- Four HLTB estimates/playtime cards move to one full-width horizontal row below the poster and the reserved download region, not alongside the installer metadata.
- Existing Community / Your Stuff / Activity and View in Steam tabs stay removed.

## Existing functionality preserved

The Steam installation location picker, native status, cancel → real uninstall confirmation and guarded prefix cleanup are **unchanged**. Controller and gamepad focus, Back, HLTB, Store page return and Steam options keep their current handlers.

GOG uses the same visual slots but no fake download UI, progress, space or achievements. Its Install placeholder remains disabled pending separate gogdl integration. This also establishes a shared visual pattern for additional supported stores once they have their own real download providers.

## On-device verification

1. Open Steam and GOG Game Details at 1280×800: portrait is prominent, three small cards at right, actions below, HLTB in four cards across the bottom.
2. Check there is room between the buttons and HLTB even with no active download, with the HLTB row staying in place during Steam downloads.
3. Start a Steam download: verify correct percent, downloaded/remaining bytes, time left, Pause/Resume, and Cancel → Steam native uninstall dialog.
4. Test installed state (Play), Back, D-pad/left stick, controller editor, options, HLTB and Store navigation.
5. Check GOG cover and hero fallback, with no invented GOG install or achievement state.
6. Test narrow layouts and long titles; progress-region overflow should not displace the HLTB cards.

CI tests and packaging are source-level checks; the visual layout and Game Mode controller transitions require on-device testing.
