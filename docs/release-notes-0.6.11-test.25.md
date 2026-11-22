# Game Library v0.6.11-test.25 — Open the actual Steam Controller Settings page

## User-verified target

The user supplied an on-device MSI Claw screenshot of the **Achilles: Survivor Controller Settings** page, with Current Button Layout, Edit Layout and Quick Settings. The previous Game Library controller icon still failed to open this exact page, even though the native gear/Start context menu works correctly in test.24.

## Root cause and change

The test.23–test.24 code used `SteamClient.Apps.ShowControllerConfigurator(appId)`, a controller configurator pop-up API. A function returning without throwing is not proof that the requested **per-game Controller Settings page** opened, and it failed in the user's actual setup.

A concrete SteamOS implementation in the Decky Nexus plugin instead uses Steam's URL handler:

`SteamClient.URL.ExecuteSteamURL("steam://controllerconfig/<appId>")`

This release changes the controller icon to use precisely that protocol for the currently selected game's validated numeric AppID.

1. First invoke the **Steam URL controllerconfig deep link** from Decky's available Steam client context.
2. If the URL API is unavailable there, enumerate the actual Steam CEF tabs; try `SharedJSContext` first and then other observed main Steam tabs with the **same** URL action. Never guess a tab name.
3. Do **not** silently open the gear/Start menu or the unrelated game Properties page if navigation fails. Instead show an explanatory toast directing the user to the original Steam Details controller icon.
4. Preserve the **working gear** unchanged. Gear and physical Start still invoke `showNativeGameOptions`, so they remain separate from controller settings.
5. No visual/CSS, HLTB, Game Mode startup, Library navigation, B, installer or other plugin changes.

## Manual test

Install `game-library-v0.6.11-test.25.zip`; open the custom Game Details for Achilles: Survivor and press the controller icon (gamepad A and touchscreen). The intended destination is the full **Achilles: Survivor Controller Settings** screen showing Current Button Layout, Edit Layout and Quick Settings, identical to the user-provided photo. The gear next to it should still open the native Steam game menu.

If the controller icon still produces no screen, report whether a toast appears. A successful return value from Steam's URL API means only that the command was accepted; this release does not falsely claim that the screen was visually confirmed on-device. In that case we should add device-side route observation rather than replacing the call with more speculative APIs.

## Evidence

- Decky Nexus (open-source) uses `SteamClient.URL.ExecuteSteamURL("steam://controllerconfig/"+game.appId)` for a controller-layout button.
- Steam's own `SteamClient.URL` TypeScript interface exposes `ExecuteSteamURL(url: string): void`.
- Regression tests validate the numeric AppID, exact deep link, CEF fallback, and separation of the controller and gear actions.
