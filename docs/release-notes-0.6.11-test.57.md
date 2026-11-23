# Game Library v0.6.11-test.57 — GOG Play setup with Proton

## What is new

After a GOG download finishes, Game Details can now show **Set up Play**. This is a separate launch-configuration flow, leaving existing GOG download, Pause/Resume/Cancel and native Steam downloads unchanged.

1. The plugin discovers **only** completed, account-matched Game Library GOG installations using its own completion markers. This includes downloads made with **Start fresh** and remains available after a plugin restart.
2. The setup dialog lists Windows `.exe` candidates from the completed game folder. Users choose the actual executable; launchers, installers and uninstall utilities are flagged as less likely to be correct. No file is launched during discovery.
3. Once confirmed, Game Library asks **the running Steam client** to add a non-Steam shortcut via `SteamClient.Apps.AddShortcut`. It **never** edits `shortcuts.vdf` or Steam compatibility config files directly.
4. Game Library queries `GetAvailableCompatTools` for that Steam shortcut, prefers an actually available Proton Experimental, or another Proton tool from Steam's list, and configures it using `SpecifyCompatTool`. If Steam cannot provide Proton, setup reports a clear error and does not claim launch readiness.
5. The created shortcut and chosen Proton tool are stored in a small account/product-scoped file in the completed GOG game directory. Interrupted setup reuses the existing recorded shortcut rather than repeatedly adding duplicates.
6. Only once the shortcut and Proton selection are recorded does the primary action become **Play**, which uses the same established Steam non-Steam shortcut gameID launch handler as other shortcuts.

## Safety

- The Steam launcher belongs to the real shortcut AppID returned by Steam, **never** the GOG product ID or a guessed Steam store ID.
- Path selection and registry writes are checked by the backend against real completed installations, account ownership and existing executable candidates. Symlinks and path traversal are rejected.
- Existing files, downloaded game data, Steam library settings and other launchers' credentials are not modified by the GOG launcher discovery.
- Shortcut creation is user-confirmed. The selected executable and Proton tool can subsequently be adjusted through the normal Steam Properties interface.
- This release does not claim that every Windows game will work with Proton; compatibility varies by game.

## Device test checklist

1. Complete a small GOG Windows download. The primary Game Details button should become **Set up Play** instead of Install or Downloaded.
2. Choose the actual game executable (not an uninstaller) and press **Configure with Proton**. Confirm Steam has added one shortcut and the plugin displays **Play**.
3. Launch via Play and confirm the game starts with Proton/Steam Input. Check B and return-to-game navigation.
4. Close Game Library and reopen the same GOG Game Details. It should show **Play** again without re-downloading or creating a second shortcut.
5. Cancel setup before confirming: no Steam shortcut should be created.
6. If Proton cannot be found, check the modal error, install/enable Proton through Steam and retry setup. Do not repeatedly add shortcuts.
7. Check an incomplete download: no Play/setup action should be offered.

These changes passed automated source and backend tests only until confirmed on the user's SteamOS device.
