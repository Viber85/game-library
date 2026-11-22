# Game Library v0.6.11-test.22 — Custom Steam Game Details (first functional version)

## Design

This is **our own React Game Details screen**, not the native Steam `/library/app/:appid` page that repeatedly resisted cosmetic CSS changes in the earlier Compact experiments. The supplied reference image showed a wide Cyberpunk 2077 banner with left-hand vertical cover, small Steam/compatibility badges, four statistics, a Play/Install row and Activity/Your Stuff/Community/Game Info sections. This release implements that composition using *each selected game's real Steam artwork and local metadata*.

- Full-width cinematic Steam hero, SteamGridDB/custom art and logo fallback, slim sidebar preserved, existing SteamOS-style system status bar.
- Vertical portrait left, title/status/ProtonDB to the right.
- Four data tiles: actual HowLongToBeat **Main Story**, **Main + Extras**, **Completionist**, and **your real Steam playtime**. The HLTB backend only provides three completion categories; the design deliberately does **not fabricate** an unavailable "All styles" fourth value.
- Original dark Midnight navy, cyan accents and shared `--gl-*` CSS variables as Home/Library, defined in the same `src/theme.ts` stylesheet; no separate colour/theme system.
- Compact install/play area: installed games use the existing verified Steam RunGame helper; uninstalled games use the original **Steam installation wizard** so drive selection, entitlements and game-specific (including non-Steam) setup remain reliable. Clicking Install from the new screen opens Steam's original game page where the user confirms installation. We do not falsely claim the download started.
- Steam's Space Required is sourced from native details if available and is shown as unknown (—) if no reliable value is returned.
- Controller configuration uses the documented SteamClient method when available; settings always have the native fallback.
- Activity shows authentic last-played/playtime plus a route to native Steam activity. **No fabricated Steam news/community posts**. Your Stuff shows actual achievements; Community opens the actual Steam community for regular Steam apps.
- Four-direction D-pad/left-stick focus navigation through Decky Focusable controls and bounded spatial navigation, a visual focus ring, Steam B/Back handling, and left-side rail access.
- Library, Search, Home's **Game Details** button and Collections now open this React component. Home's existing direct Play/Install actions stay unchanged to avoid breaking a long-standing action.
- Back returns to the same existing Dashboard instance and attempts to restore the exact card/grid focus. Original Steam Details remains accessible through the `Steam Details` button for installation/settings/unimplemented functions. Steam's native pages and all their CSS stay unchanged; prior Compact native injection remains disabled.

## Manual SteamOS validation (MSI Claw A8)

1. Install `game-library-v0.6.11-test.22.zip` through Decky.
2. From the custom Library choose any native Steam game (press A on its card), or choose **Game Details** on Home.
3. Verify hero, selected game's cover/title and HLTB data, and D-pad/left analog **up/down/left/right** focus among Back, primary action, HLTB (when available), Steam Details, controller/settings, and four content tabs.
4. Press B and verify return to the previous library selection/scroll. Repeat from Collections and Search.
5. With an uninstalled game, select Install; verify the original Steam Details screen appears with the native Install control. Confirm Steam lets you choose a drive/location and actually start the download. When the game is installed, select Play and verify launch.
6. Check a non-Steam shortcut separately: launching uses its canonical Steam gameID; installing any uninstalled non-Steam content still defers to its original native/Unifideck-specific workflow.
7. Test long titles, games without a cover/hero, unavailable HLTB, and display scaling at 1080p and handheld resolutions.

## Scope and limits

- This is a working, test-passing **first implementation**, not an on-device visually verified release. Pixel-perfect reproduction of the reference and analog focus behavior require the user's photograph and test.
- Actual native Steam notifications, user posts, downloads/progress, and real-time advanced Steam game actions are not duplicated; their native screens remain accessible.
- A direct Steam install trigger is intentionally **not** implemented without a verified stable native API; Install first opens the official Valve page for confirmation. This avoids incorrectly starting or reporting a download.
- Steam Community is available for actual Steam apps; non-Steam providers retain their safe native fallbacks.
