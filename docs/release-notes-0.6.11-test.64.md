# Game Library v0.6.11-test.64 — unified five-item Steam/GOG game menu

## New game options

Steam and GOG Game Details share one compact, controller-focusable Decky modal.
Physical **Start/Menu** and the settings gear open the same UI with exactly:
1. **Install / Play** — uses the existing provider-specific install/launch action; GOG still shows Set up Play when downloaded but not yet configured
2. **Add to Collections** — opens a dedicated submenu listing Game Library Backlog/Completed, the Game Library custom library tabs and native Steam user collections. The first two use their existing backend, custom tabs use `saveOwnTabs`, and Steam collections use the live Steam `collectionStore` AddApps/Save rather than writing VDF files
3. **Controller Settings** — opens the existing native SteamOS controller configurator
4. **Change Artwork** — navigates directly to the **installed SteamGridDB Decky plugin** route `/steamgriddb/:appid` that is registered by the official plugin in `src/index.tsx`. Steam shortcut IDs are passed in Steam's signed int32 form, not GOG numeric product IDs
5. **Game Properties** — calls the native SteamClient Apps `OpenAppSettingsDialog(appId,"general")`, exposing Steam's launch options, Compatibility and other tabs without recreating or editing them

## Compatibility and guardrails

- Steam uses its real Steam AppID. GOG uses only the Steam shortcut AppID created by **Set up Play**. An owned but unregistered GOG game does not yet have Steam Properties, artwork-plugin route or Steam collections; those options clearly ask the user to finish setup rather than invent a Steam ID.
- Game Library's Backlog/Completed and custom tab membership use Steam-backed AppIDs. GOG games become eligible once their Steam shortcut is registered; support for provider-only pre-installation GOG collection membership remains a separate future enhancement.
- Clicking SteamGridDB opens the external plugin's registered route. This integration requires that Decky SteamGridDB is installed and enabled. If unavailable, the route may fail to open; the plugin is not bundled.
- Steam native Properties API is part of Steam Game Mode and supports the real Steam/non-Steam shortcut; test section routing on device. No clone is shown.
- The collection picker excludes Steam smart/dynamic collections that do not support AddApps; it lists editable Steam user collections. Native library collection writes occur only on explicit A confirmation and are saved through the Steam client.
- Artwork navigation arms our existing Steam/GOG Game Details return-state handling so B should return to the same details page. No game files or Steam configs are written by this menu.
- Existing install/download, Pause/Resume/Cancel, HLTB, Store, achievements and Proton launching remain unchanged.

## MSI Claw verification

1. Open a Steam title, press Start, and confirm five options in a compact custom menu; gear should open the identical menu.
2. Add and remove a game from Backlog/Completed, custom tabs, and one existing Steam user collection. Check the real Steam library reflects the native collection.
3. Choose Controller Settings: the same SteamOS pre-edit controller screen should open, with B returning.
4. Choose Change Artwork: official Decky SteamGridDB should open the chosen game's asset tabs. B should return to Game Details.
5. Choose Game Properties: the native SteamOS Settings dialog should show General/Launch Options and Compatibility, without opening the whole native Details page.
6. Repeat for a GOG game configured via Set up Play; ensure the Store/HLTB links and Game Mode navigation still work.
7. For an owned, not-yet-configured GOG game, Steam-only actions should explain Set up Play is needed and must not create unintended Steam shortcuts.

Automated tests assert menu parity, provider AppID validation, route selection and collection APIs. Runtime UI and Steam plugin route availability must be confirmed on-device.
