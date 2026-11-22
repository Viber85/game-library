# Game Library v0.6.11-test.47 — GOG hero fallback from the game card

## Change
If an owned GOG game has neither a working native GOG hero nor a usable
SteamGridDB hero, display **the exact cover image already loaded in the
game's own card** as the hero background.

Image order:
1. Native GOG background (when present and loadable)
2. SteamGridDB hero (when present and loadable)
3. The actual loaded game-card cover (native GOG cover, legacy cover, or
   SteamGridDB cover, whichever was successfully displayed)

The poster component reports its loaded image URL via `onImageLoaded`.
Game Details remembers it only for that game's store-scoped key, avoiding
stale artwork when navigating between games. This reuses an already
requested image; no additional API call or provider dependency is needed.

The card cover fills the full-width hero with `object-fit:cover`, preserving
its aspect ratio, with a light blur and the existing dark gradient to reduce
the impact of enlarging a portrait image. Original hero images remain sharp.

## Unchanged
- SteamGridDB API settings, rate limits, account validation and caching
- GOG poster selection and GOG Game Details four-way navigation
- Steam Game Details, downloads, native install/cancel, and HLTB
- GOG Install remains disabled until the independent gogdl backend exists

## Device checks
1. Open a GOG title with a native or SGDB hero: it should look unchanged.
2. Open a title with no hero: its actual portrait card artwork should
   fill the hero area, behind the same dark gradient.
3. Test a title where GOG cover fails and SteamGridDB supplies the card:
   the same SteamGridDB cover should become its hero fallback.
4. Switch between different GOG games: the previous game's card art must
   not flash as the next game's background.
5. Verify D-pad navigation and Back still work on MSI Claw.

This was checked by source regression tests and CI; the visual result still
requires on-device verification.
