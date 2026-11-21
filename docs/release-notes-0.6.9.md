# Game Library v0.6.9 — Install Size for uninstalled Steam games

This release addresses uninstalled **Steam** titles showing a dash despite
installed games having usable size metadata.

## SteamOS as the first source

- Installed Steam games continue using the local `size_on_disk` bytes.
- Uninstalled Steam games now first read Steam's
  `lDiskSpaceRequiredBytes` field, via locally available native app
  details / overviews, without an external network request.
- On selection, the plugin subscribes to
  `SteamClient.Apps.RegisterForAppDetails` and refreshes the size if
  Steam populates the app's installation requirement. Listeners are
  removed when the card loses focus.
- The native value is shown as **~GB** (space Steam expects the game to
  need for installation), not mislabeled as already installed bytes.

## Fallback and cache behavior

- If SteamOS has no local requirement, the previous selected-card
  Steam Store storage-requirement lookup remains the fallback
  (850 ms focus delay, bounded cache, request throttling).
- A **single local cached-bulk lookup** when Library opens hydrates
  previously fetched Store estimates across existing cards. It does
  not make external network requests per cover.
- Old `unavailable` / `error` values cached by previous versions
  are invalidated once; valid positive estimates survive migration.
  This avoids showing a stale dash long after a failed lookup.
- Non-Steam and installed-game measurement paths are unchanged.

## Limits

Not all Steam games expose `lDiskSpaceRequiredBytes` before installation.
Steam Store entries may also omit explicit Storage requirements. In those
cases the honest value remains **—**. The plugin must not invent an
exact download size or install files merely to learn their size.

## Device validation

1. Install v0.6.9 and open Game Library > Library > All Games.
2. Check several installed titles; the current locally measured GB
   should be unchanged.
3. Check several **uninstalled Steam** titles and focus one for at
   least 2 seconds. When Steam knows the needed space, it should show
   an estimate such as **~70 GB**.
4. Leave Library and return: existing locally cached estimates should
   populate without refetching each game.
5. Select an uninstalled title without a storage requirement: it
   should remain **—** rather than displaying another game's size.
6. Test D-pad and analogue focus in Home / Library / Search; no
   navigation handlers were changed in this release.

GitHub Actions typecheck, Node/Python regression tests and ZIP packaging
must pass. Final SteamOS behavior still requires testing on hardware.
