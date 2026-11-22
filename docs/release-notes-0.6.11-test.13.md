# Game Library v0.6.11-test.13 — Compact Game Details detection and diagnostics

This test release follows a real on-device diagnosis in which Steam's Midnight stylesheet was **verified** in the CEF tab but the captured page was **Unclassified**, with classes belonging to the Game Library plugin itself. That does not demonstrate an active native Steam Game Details match.

## Fixes

- **Relaxed overstrict DOM gating.** Test.12 required both Steam's hero module and Play/Install module to coexist before any Compact CSS could apply. On SteamOS those components can mount at different times. Compact styling now requires only the native game-details hero module; a narrowly scoped opt-in PlayBar fallback retains its layout if the hero module loads later.
- **Compact quick check is at the top of the CEF diagnostic results**, before hundreds of raw CSS class/color samples. It separately displays the option state, Midnight CSS verification, Compact CSS presence, a **previously verified real Compact match**, and readable native hero/PlayBar selectors.
- **Explicitly identifies when the captured UI is Game Library** (`.gl-root`) rather than Steam's own Details screen. This explains misleading `route: other` or `Unclassified` snapshots.
- Keeps historical match evidence from the CEF watcher while Steam unmounts the underlying Details page when QAM opens. A recent match is a reliable positive; a zero class count alone is not proof of failure, because Steam can hash all CSS-module names.
- Updated native theme and audit revision to force safe reload after installing over test.12.

## Test sequence

1. Install `game-library-v0.6.11-test.13.zip` from Decky.
2. Enable **Midnight** and **Compact Game Details · Test**.
3. Go to a **native Steam game's Details page** (not the GOG details page and not our Game Library plugin Settings).
4. If compact styling or the small `COMPACT · TEST` label appears, take a screenshot of the game.
5. If nothing changes: from that native game page, open Decky → Game Library → **Read CEF diagnostics (no reload)**. Photograph the new **Compact Game Details — Quick check** section at the **top** of the output. No need to photograph the verbose CEF snapshot log.
6. Check Install/Play, controller configuration and Activity/Your Stuff/Community/Game Info tabs. Turn Compact off to restore Steam's original layout.

### Boundaries

This is a test of Steam's **original** page and native controls. It neither replaces Valve's React components nor changes any GOG games. No guarantee of the first concept's pixel-perfect appearance until native SteamOS screenshots confirm actual CSS selectors.
