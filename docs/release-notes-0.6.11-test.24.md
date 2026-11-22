# Game Library v0.6.11-test.24 — Controller button and Steam game menu

## Report
On the user's MSI Claw Game Details screen for **Achilles: Survivor**, the game information, hero, HLTB, native navigation and action row are visible, but:
- The controller icon still did not open the Steam Input configurator.
- The adjacent cog icon should open **the exact same game context menu as Start/Menu on a Library game card**, not navigate to the original Steam Details page.

## Changes
1. **Gear → existing native Steam context menu.** The new custom Game Details cog calls `showNativeGameOptions(game.id, focusRefs.current.settings)`, the **same** function invoked by the Library card's `onMenuButton` handler. Opening with A/touch or Start while that icon is focused reaches the same native menu (Steam's own Manage / Properties and any integrated options). Failure gets a short toast rather than silently opening another page.
2. **Controller icon → Steam SharedJSContext first.** Test.23 tried `SteamClient.Apps.ShowControllerConfigurator(appId)` in the Decky React window first and treated a non-throwing call as success, even when the MSI Claw displayed nothing. The known working Unifideck SteamOS implementation invokes the exact API from the Steam CEF **SharedJSContext** target instead. This version examines only the actual CEF tab list, tries `SharedJSContext` before other reported Steam targets, and uses the Decky-window method only as a last fallback. Calls are on demand, AppIDs are validated integers, and no controller mappings are modified.
3. If Steam Input cannot be invoked from either context, the controller button opens the *same native Start game menu* as a usable fallback (where Controller Layout may be offered by the client), and explains what happened. It never routes to generic game Properties pretending those are controller layout controls.
4. No changes to theme CSS, Game Details dimensions, hero/artwork/HLTB, Steam game installation, Home startup, Back, gamepad navigation or original Steam Details.

## Device check
- Install `game-library-v0.6.11-test.24.zip`.
- On the custom Details page, select **cog** with A, or use Start while the cog is focused: confirm the same Steam menu seen with Start on a Library card, ideally with Properties, Manage, and relevant plugin entries.
- Select **controller icon**: confirm the actual Steam Input Controller Settings / Edit Layout editor opens. For a game **not installed**, controller customization may depend on Steam's available menus and layout; compare to the original Steam page's controller icon for that same AppID.
- If Steam Input still does not appear, note whether the regular game menu opens as fallback. This distinguishes a failing Steam Input API from a missing gamepad button action without guessing.
- Verify original Back and D-pad behavior from test.23 is unchanged.

## Verification limits
The TypeScript build and automated regressions verify common menu handler reuse and Steam CEF invocation order. There is no emulator of the MSI Claw's Steam Input pop-up, so opening the actual controller configurator must be confirmed on the device.
