# Game Library v0.6.11-test.23 — Native controller focus, precise Back, Steam Input editor

## Report reproduced

On MSI Claw A8 (SteamOS), custom Game Details from **Library** opened and worked by touchscreen, but its controller/D-pad and B did not activate the new screen. Touch Back returned to the generic Library page rather than to the exact grid/location. The same component opened from **Home → Game Details** and navigated correctly with D-pad and B. The controller icon opened generic Steam game settings, not the actual input-layout editor.

## Fixes

- **Steam-native focus in Library:** when the custom Details component replaces any Dashboard subpage, enable the existing `vgp_ondirection`/Steam navigation-tree bridge specifically for `.gl-game-details .gl-details-focus`. Uses `BTakeFocus` to transfer Game Mode controller focus, not only `HTMLElement.focus()`. The bridge is active only while the custom Details is open. Home, Library grid, Collections and Settings retain their previous route behavior outside Details.
- **Focus on first render:** use the proven `focusNativeMenuControl` helper for Back on mount and retry once after the game's new Focusable controls register, unless the user already moved focus. Four-direction navigation uses the native next-target calculation and Steam's `BTakeFocus` first, falling back to browser focus only when necessary. D-pad input on the new page does not propagate to the hidden Library grid.
- **Actual clickable Back:** the **Back to Library** button now explicitly wires `onActivate={onBack}` in addition to gamepad `onCancelButton`. The Back callback does not call the native Steam Back or the Library exit-to-Home command.
- **Precise location restoration:** save the selected Steam game ID, grid index and scrollTop before the temporary Details view mounts, and restore the same grid/card and native focus when closing. On Home, return to the Home Details action or selected card as appropriate. Collections already saves `{section,tabId,gameId}`; its own card-restore logic now runs without Dashboard prematurely focusing the Collections rail. Focus retries are bounded and do not keep polling.
- **Real controller layout:** the controller icon calls Steam's documented `SteamClient.Apps.ShowControllerConfigurator(appId)`. If this function is unavailable in the Decky React context, the on-demand action tries the actual existing Steam CEF browser tab using Decky's `executeInTab` and the same documented Steam method. It validates numeric AppIDs, does not alter controller mappings, and does not substitute generic game settings. When unavailable on this client, the user sees a short actionable message advising the native game's controller icon. The *separate gear icon* still opens the original Steam game settings.
- **No change** to Home's proven Play/Game Details behavior, autostart Home, Midnight visual styles, HLTB source, Steam install handoff or Steam's native Details CSS.

## Device validation

1. Install `game-library-v0.6.11-test.23.zip` in Decky Loader.
2. **Library:** open a game with A, test D-pad/left stick all four directions, A on Back and B from several buttons. Verify each returns to the *same* tab, sorted grid row and card scroll position, not Library Home.
3. **Home:** open using Game Details button; test the previously working four-direction and B navigation still works, and returns to the original Home selection.
4. **Collections:** open a game in a nested collection; B should return to that same collection and selected game.
5. With any Steam game, select the **controller icon**. It should open Steam's Controller Settings / Edit Layout configurator. The nearby gear icon should still open the ordinary Steam game Settings. If the controller API is absent from the user's specific client, the new build explains that rather than silently opening a different page.
6. Confirm Install and Play behavior remains unchanged.

## Limits

Static CI exercises the focus-tree adapter and Back/route source contracts, but the physical MSI Claw SteamOS focus handoff and the availability of the controller configurator in the user's CEF build require on-device verification. This release intentionally does not add global B-button interception outside the new Details page.
