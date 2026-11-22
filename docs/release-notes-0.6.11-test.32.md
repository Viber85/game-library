# Game Library v0.6.11-test.32 — HTTPS Store through ExternalWeb (controlled navigation experiment)

## User-proposed hypothesis

The MSI Claw opens both HLTB and Steam Store from the same custom Game Details route and main Steam Game Mode window, yet **HLTB → B works** while **Store → B gets stuck at the previously visited Controller Settings**. The one meaningful remaining difference is the browser handler and link protocol:

- HLTB: `ExternalWeb("https://howlongtobeat.com/game/<id>")`.
- Store (test.31): `SteamWeb("steam://store/<AppID>")`.

The user proposed a simple A/B experiment: open the Store via **the same `ExternalWeb` path** as HLTB, using the ordinary `https://store.steampowered.com/app/<AppID>` URL. This is a hypothesis grounded in observed device behavior, not proof about the native Steam browser's history implementation.

## Changes — intentionally minimal

1. `steamStorePageUrl` now constructs `https://store.steampowered.com/app/<AppID>`, still rejecting invalid AppIDs and non-Steam shortcuts.
2. `openBrowserFromMainGameDetails("store", url)` now invokes `GamepadUIMainWindowInstance.m_Navigator.ExternalWeb(url)`, **the identical navigator used for HLTB**. Both continue targeting the same main Game Mode window. No SteamWeb or steam://Store call remains on this path.
3. The legacy in-place Details branch uses the same HTTPS + ExternalWeb path so it cannot reintroduce the issue.
4. Tests cover both URL types, external-only handler, native navigator binding, focused Controller Settings window not being chosen, correct Game Details page, and safe AppID validation.
5. No changes to Controller Settings, its working B return, Game Details native route, D-pad/analog rail navigation, cog/Start context menu, HLTB lookup, layout or styling.

## Functional trade-off

The Store now opens as an **external website in Steam's browser**, not its fully integrated native Store view. Account login may not be carried over. Product description, reviews and price should still be viewable where available, but purchasing or wishlist actions should not be assumed to work until confirmed. This version is a deliberately focused **diagnostic trial**, not a claim of final native Store integration.

## MSI Claw validation

1. Game Details → **HLTB details** → B: verify the existing working return remains unchanged.
2. Game Details → **Steam Store**: verify `store.steampowered.com/app/<AppID>` loads in an external browser view.
3. Press B: does it return directly to **the same Game Details**, without Controller Settings appearing or getting stuck?
4. Repeat after visiting **Controller Settings → B → Game Details** first; this is the exact scenario that previously reproduced the bug.
5. If both now return correctly, the protocol/browser pathway is the isolated differentiator; if Store still fails, more direct runtime observation is needed before changing navigation again.

Automated tests verify which API and URL are called, but cannot assert real Game Mode back-stack behavior on the physical MSI Claw.
