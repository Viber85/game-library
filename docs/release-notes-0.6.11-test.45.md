# Game Library v0.6.11-test.45 — GOG hero images from SteamGridDB

## Fix
Game Details for an owned GOG game could show an empty hero background even
when the SteamGridDB plugin artwork provider had a matching hero.

- Keep GOG's original `background` as the **first** hero image candidate.
- If no native GOG hero exists, or its image URL fails to load, request a
  SteamGridDB `hero` for that *selected* GOG title.
- Reuse `getGogSteamGridFallback`, the existing shared cache and
  `gog_steamgriddb_art(accountId,productId,title)` backend RPC used by GOG
  covers. No duplicate global lookups across the library.
- SGDB's account-owned ID/title validation, strict title match, optional API
  key, user toggle, URL allowlisting, and positive/negative caches remain
  unchanged. The API key never enters the browser.
- A broken SteamGridDB hero fails gracefully to the normal theme background.
- Changes to the SteamGridDB setting/key trigger a retry when GOG art is missing.
- Installed-state/launch/download functionality remains untouched; the
  installer is not wired up yet.

## Achievements research (implementation planning only)
Unifideck's current achievements watcher supports GOG, Epic and Microsoft:
GOG's Comet sends unlock push events and the watcher also periodically
queries GOG account achievement data; Epic fetches definitions and unlock
state through authenticated Epic GraphQL, while the game itself unlocks
via EOS; Xbox uses account-specific Live services. Stores like Amazon,
Ubisoft and EA do not have automatic support via those same APIs.

The safe Game Library roadmap is a provider-neutral per-title achievement
record keyed by `store:productId`, read-only account sync on demand,
a running-game watcher for supported stores, and local notifications.
Do not infer that GOG product IDs are Steam IDs or try to unlock
achievements from the frontend. The user's GOG account authentication,
`gogdl` installer and optional Comet integration must be handled by the
Game Library backend, separately from any other Decky plugin.

## MSI Claw verification
1. Open a GOG game that has no `background`. With SteamGridDB enabled and a
   configured key, the visible hero should load from SteamGridDB.
2. Open a GOG title with a valid native background; it should keep that
   native image even if SteamGridDB offers different artwork.
3. Check SteamGridDB settings: disabling artwork should not trigger new
   SteamGridDB lookups, and missing API keys leave the normal background.
4. Verify GOG cover, HLTB, ProtonDB, Back button and Steam game details
   and downloads behave as in test.44.
