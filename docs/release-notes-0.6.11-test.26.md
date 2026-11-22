# Game Library v0.6.11-test.26 — Open the pre-edit Steam Controller Settings page

## Device finding

On MSI Claw SteamOS, v0.6.11-test.25 successfully opened the Steam **Edit Layout** screen when the user pressed Game Library's controller icon. This is **one screen too far**. The user explicitly requires the preceding **Controller Settings** page (shown in their photograph), containing:
- Current Button Layout / recommended layout
- View Layout and Edit Layout buttons
- Quick Settings (extended buttons, gyro, trackpad, inversion)

The cog/Start game context menu now works correctly and MUST stay unchanged.

## Root cause verified against Steam's own UI code

The v0.6.11-test.25 implementation used:

`steam://controllerconfig/<appid>`

This URI navigates directly to layout editing on the user's SteamOS build. Steam's actual Game Mode game-card controller icon instead uses:

`ClientRoutes.GamepadUI.ControllerConfigurator.Main(appid)`

Its route generator is `/app/<appid>/controllerconfigurator/main`. Steam's controller configurator React component attached to that exact Main route renders the Current Configuration section, Edit Layout and Quick Settings. This was verified in publicly readable unobfuscated Steam client code:
- `ricewind012/steam-ui-unobfuscated/src/chunk~2dcc5aaf7/37449.js` — `ControllerConfigurator.Main` route generator.
- `ricewind012/steam-ui-unobfuscated/src/chunk~2dcc5aaf7/56262.js` — native game page's controller icon pushes `ControllerConfigurator.Main(game.overview.appid)` into Steam history.
- `ricewind012/steam-ui-unobfuscated/src/chunk~2dcc5aaf7/85399.js` — Main route's component displays Current Button Layout and Quick Settings.

## Change

- Controller icon now uses the native Steam Game Mode navigation API: `Navigation.Navigate("/app/"+appid+"/controllerconfigurator/main")`, with strict numeric AppID validation and safe error handling.
- Completely remove `steam://controllerconfig`, `ShowControllerConfigurator` and CEF-tab injection for this button. None of those reliably navigated to the requested pre-edit page.
- Keep the separate working cog icon opening `showNativeGameOptions`, identical to Start on the Library card.
- No changes to artwork, Midnight CSS, gamepad focus, Library/Home Back, installation, HLTB or startup auto-open.
- New regression tests check exact native route, invalid IDs, one-only navigation and independence from the gear action.

## On-device test

Install `game-library-v0.6.11-test.26.zip` through Decky. On Achilles: Survivor's custom Game Details page, press its controller icon. It should now navigate to **Achilles: Survivor Controller Settings**, showing Current Button Layout and Quick Settings before Edit Layout. Then use Edit Layout from there; B should return to the previous screen through Steam history. Confirm cog still shows native game context menu.

The Game Mode route exists in Steam's client code, and CI verifies it is called. Rendering that route on the user's exact SteamOS build still requires the user's device test. If the page fails to appear, diagnose the current game's Steam navigation history and root route rather than trying another controller-configuration popup or URI.
