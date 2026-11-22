# Game Library v0.6.11-test.29 — HLTB return, genuine Steam Store button and Game Info cleanup

## MSI Claw report

In v0.6.11-test.28, the custom Game Details HLTB details button opens the correct HowLongToBeat page. But closing that page briefly showed the **old Controller Settings** page before dropping to the generic Library list, instead of returning to our own Game Details. The user also requested:
- The action-row **Steam Details** button should open that game's **Steam Store page**.
- Remove the redundant **Original Steam Details** button from the **Game Info** tab.

## Changes

1. **HTLB opens with Steam's external web navigator.** The former `Navigation.NavigateToSteamWeb(hltbLink)` navigated through native SteamWeb history and, after previously visiting Controller Settings, replayed that stale route. It now uses `Navigation.NavigateToExternalWeb(hltbLink)`, the real Steam UI's external-site browser. Validate that the URL matches `https://howlongtobeat.com/game/<number>`; no invented HLTB links.

2. **Restore custom Game Details when leaving the web browser.** Before external navigation, Dashboard stores an existing route-specific **single-use** Game Details return token containing selected AppID, previous Home/Library/Collections route, card focus index and grid scroll position. It reuses the already-tested Controller Settings return machinery and remembers the current Library tab. When the native browser returns to that route, our Dashboard reopens the **same custom Game Details**, not generic Library. If Steam returns to native Home first, the existing HomeReturnGate redirects to the originating plugin route. If the browser was only an overlay and Dashboard never unmounted, explicitly closing Game Details clears pending state to prevent stale redirects. The controller's verified Back and two-way sidebar focus are unchanged.

3. **Steam Store instead of native Steam details.** The action-row button for a native Steam game is renamed **Steam Store** and opens the Steam client `steam://store/<AppID>` via its `Navigation.NavigateToSteamWeb`, matching Steam's own `Store Page` behavior. Strict AppID checking avoids treating non-Steam shortcuts as store apps. For non-Steam games, the button retains its safe native Details fallback rather than inventing a Store product.

4. **Game Info cleanup.** Remove the redundant `Original Steam Details` button from the Game Info tab. Its genuine store, installation/setup and game menu access are still available through the respective existing controls.

5. **Tests.** Add regression tests for real HLTB and native store destinations, one-shot HLTB return, expiry/cleanup of stale tokens and Game Info button removal. Existing gamepad, Controller Settings B/return, installation and Library tests remain enabled. No visual CSS changes.

## MSI Claw device test

1. Open any native Steam game from the custom Library, select Game Details → Controller Settings → B to return (previously verified).
2. From restored Game Details, select **HLTB details** → wait for the HLTB page → B. It should return to **the same custom Game Details**, with no Controller Settings flash or generic Library exit.
3. Press B again to return to the previous Library selection.
4. Select **Steam Store** in the Game Details action bar and confirm the selected game's real Steam Store page opens. B should return to the same game's own Details.
5. Open **Game Info** tab: confirm `Original Steam Details` has been removed while Store/Status/Last Played/Playtime and release metadata remain.

## Verification limit

CI confirms the actual navigation functions and return contracts, but Steam's UI browser history may differ between SteamOS builds. The removal of the transient Controller Settings flash and final B destination must be verified on MSI Claw. The fix avoids the previously problematic SteamWeb route for HLTB and preserves an explicit return snapshot.
