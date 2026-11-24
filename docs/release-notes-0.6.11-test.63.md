# Game Library v0.6.11-test.63 — four missing GOG Game Details actions

## Changes

- **HLTB details:** restored the right-side HLTB button in GOG Game Details. It opens only a verified `howlongtobeat.com/game/<id>` page from the existing GOG-specific HLTB lookup; an unmatched title reports that no verified page exists.
- **GOG Store:** restored the Store action in the same position as the Steam Store button. It resolves the game's true GOG product ID → slug via GOG's product catalog, validates the ID matches the current owned game, and opens its direct `https://www.gog.com/en/game/<slug>` page in Steam's ExternalWeb browser. No guessed URLs or title-based links.
- **Controller Settings:** restored the gamepad icon. After **Set up Play**, uses the registered non-Steam **Steam AppID**, not the unrelated GOG ProductID, to open Steam's native full Controller Settings screen. Before a shortcut exists, it displays a clear setup message rather than navigating to an invalid ID.
- **Game context menu / Start:** restored the settings-gear icon and mapped physical Start/Menu while *any* GOG Game Details button is focused. If a GOG non-Steam shortcut exists and Steam can show its native game options, it uses the native Steam menu. Otherwise it shows a Decky native-style GOG context menu with safe Install / Set up Play / Play, HLTB, Store and Controller actions.
- The four actions reuse Steam's existing `gl-details-action-tools` layout and native Focusable D-pad navigation. Install/Play remains separate on the left; the links and icons align right, including at narrower handheld resolutions.
- **Navigation return:** because GOG Details is on a transient Dashboard route (unlike Steam's dedicated details route), ExternalWeb and native controller settings arm a short-lived GOG-product-scoped return snapshot. B returns to the same GOG Game Details and avoids treating the numeric GOG ProductID as a Steam AppID.

## Preserved

- Existing Steam Game Details, the Steam Store/HLTB routes, and their native Start menu are unchanged.
- GOG downloads, storage selection, Pause/Resume/Cancel, achievements, installed-size display, Proton launch and shortcuts remain unchanged.
- Store and HLTB buttons remain visible even if the external page lookup fails; clicking one provides a direct error rather than a random URL.
- No background writes to Steam's library; the GOG Store lookup is read-only and cached.

## MSI Claw verification

1. Open a GOG title and verify **Install/Play** on the left and **HLTB details**, **GOG Store**, gamepad and gear on the right at the same sizes/alignment as Steam.
2. HLTB and GOG Store should open the matching title's page. Press B to return to the same GOG Details.
3. For an installed GOG game configured with Proton, tap the gamepad icon; it should open that shortcut's native controller settings and B should return to GOG Details.
4. Press physical **Start** while Install or HLTB is focused; it must open game options. Click the gear to open the same options. Check that an unconfigured GOG game displays safe GOG actions instead of a non-existent Steam game's options.
5. Verify D-pad and left-stick navigation among all five actions without losing focus to the background Library.
6. Confirm an ordinary Steam title still has working Steam Store, HLTB, native Controller Settings and its original Start menu.

All automated source/navigation/backend tests and package checks are included. The Steam Game Mode context menu and actual browser-return behavior still require hardware testing.
