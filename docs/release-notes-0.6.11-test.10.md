# Game Library v0.6.11-test.10 — GOG fully inside the native Dashboard + Tab Manager

## This release
- **Removed the standalone GOG Library page** (\`GogLibraryPage.tsx\`). Steam and GOG use the same Dashboard game tile pipeline, full grid, home preview, search results, tab switcher and controller navigation.
- **GOG is a persisted built-in tab in Tab Manager**, not a hard-coded extra tab outside its control. The user may move it, rename it, hide it or show it just like Steam and Non-Steam. Its position and visibility are stored per Steam account.
- Existing saved tabs, custom tabs, manual collections, ordering, and hidden tabs are **migrated without resetting them**; one default GOG tab is appended once to older profiles.
- **All Games includes owned GOG games** alongside Steam and registered Non-Steam shortcuts. Search's GOG source includes the independent catalog and existing Steam shortcuts that are tagged GOG in Steam collections.
- GOG games use store-namespaced identifiers (\`gog:<product-id>\`) and cannot trigger native Steam actions using unrelated Steam app IDs. Steam shortcuts remain Steam-registered games with their original actions.
- **Selecting a GOG game opens the shared details shell within Dashboard**. Steam games still use the native Steam details route, preserving its working Install/Play and other client actions. B returns to the same Dashboard card.
- Both D-pad and left analog use the same four-direction grid neighbor rules. Alphabet jump and 60-card progressive loading now operate across store-namespaced entries.
- GOG artwork remains GOG-CDN-first, optional SteamGridDB fallback. GOG tiles get a small neutral store marker. No separate GOG grid CSS is used.
- **No misleading GOG Install/Play button** is shown: the independent GOG installer/launcher is the next development phase, not part of this release.
- No Unifideck code, tokens, backend or runtime is used.

## Test on SteamOS
1. Install \`game-library-v0.6.11-test.10.zip\`.
2. Open **Plugin Settings → Tab Manager** and verify GOG is listed with built-ins. Move it, hide it, restore it; verify ordering appears on the Dashboard filter bar and survives navigation.
3. Open **Library → GOG** and **All Games**. The same Steam-style full grid should render owned GOG covers.
4. Open **Search**, type a prefix from a GOG title and switch to GOG as source. A/touch on GOG opens the shared Dashboard details. B returns to the correct tile.
5. Verify a Steam game still opens its original Steam details and Install/Play work exactly as before.
6. On the GOG tab, try all four D-pad and left-stick directions, L1/R1 tabs, Y sorting, A details and B back.

**Important:** If a game was also registered as a Non-Steam shortcut by another tool, both a Steam shortcut and a GOG-owned catalog record may appear in All Games. They have separate identities until an explicit store-linking/deduplication feature is implemented; neither record is silently overwritten.

No reinstall or reconnect is required for a linked GOG account.
