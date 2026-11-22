# Game Library v0.6.11-test.27 — Correct Controller Settings Back and two-way Game Details/rail focus

## Verified by user

- The full Steam **Controller Settings** page now opens correctly in `v0.6.11-test.26` (Current Button Layout, Edit Layout, Quick Settings).
- Pressing **B from Controller Settings** returns to generic Library, instead of the custom Game Library **Game Details** page that launched it.
- The D-pad/left analog cannot move focus between **Game Details** and the permanent left navigation rail, in either direction.

## Cause and targeted repair

### Controller Settings → Game Details → Library

Steam's native Controller Settings URL is a real Game Mode route: `/app/<appid>/controllerconfigurator/main`. Our custom Game Details was **React-only state inside the Game Library route**, not a navigable Steam history entry. Steam B therefore correctly returns to the previous Library route but loses that React-only state.

New `controllerSettingsReturn.ts` stores a short-lived, one-shot return token **before** navigating to Controller Settings: originating route, validated AppID, selection, grid/card index, scroll position and Home/Library/Collections card type. Dashboard consumes this exact-route token on remount to **render our Game Details again**, with its previous return target. Existing `rememberGameDetails()` preserves the source Library tab and sort/scroll context. The token is consumed once, expires after 10 minutes, is never persisted, and is cleared if the native route call fails. The next B from our restored Game Details still returns to the original Library/Home/Collections screen.

This does not inject a global B handler, alter Steam's controller editor, or hijack unrelated routes. Steam's native B/history is preserved.

### Game Details ↔ left rail

- Use the existing native `BTakeFocus` bridge to enter the left rail via **D-pad LEFT from any left-edge detail action**, not only the Back button. Both Game Mode D-pad and left analog direction events are handled.
- `focusRail()` now uses `focusNativeMenuControl`, not a DOM-only `element.focus()`.
- **D-pad RIGHT from the left rail while Details is open** returns native Steam focus to its Back control instead of attempting to focus a *hidden* Library game card. The rail's B action also does this while Details is open.
- The native CEF direction-capture bridge has targeted, fallback-safe paths in both directions. When Details is closed, the rail retains its preexisting normal Library/Search/Home behavior.

## What has NOT changed

The verified Controller Settings screen/route, the working Start-equivalent cog game menu, Game Details layout and Midnight CSS, artwork, HLTB, game installation, Library game launch, and Game Mode automatic Home startup.

## Tests

Added unit and source-integration tests for a one-shot route return, preserving the exact AppID/card/grid position, Home/Search/Collections origins, invalid IDs/expired tokens, and two-way native focus. Updated pre-existing sidebar and Search rail regression expectations to explicitly check the new Details-only branch. Build/package and all automatic tests pass; **on-device SteamOS confirmation still required**.

## MSI Claw verification

1. Library → Achilles: Survivor (custom Game Details) → controller icon → **Controller Settings**. Press **B**. It should return to the **Achilles: Survivor Game Details**, not generic Library.
2. Press **B once more**. It should return to the original Library tab and selected game, without reopening Controller Settings.
3. From Game Details, move **LEFT** until you reach the rail (from Back, Activity, or the leftmost action). The rail should expand and accept up/down.
4. Press **RIGHT** from the rail: the Back to Library action on **the same Game Details** should get the native focus. Repeat using left analog.
5. Repeat from Home's Game Details button. The user-confirmed Controller Settings icon and working cog must behave as before.
