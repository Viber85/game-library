# Game Library v0.6.11-test.33 — Native Steam install wizard from custom Game Details

## User-reported behavior

Steam Store and HLTB Back are now working on MSI Claw with v0.6.11-test.32. The custom Game Details' **Install** button still opened the original Steam `/library/app/<AppID>` game-details page rather than launching the Steam installation process and presenting a Steam library/disk location chooser.

## Verified cause

`src/SteamGameDetails.tsx` explicitly called `onNativeDetails()` whenever `installState` was false. That action cannot open an install wizard by itself.

Steam's actual GamepadUI install-action store implements `InstallApp(appId)` using `SteamClient.Installs.OpenInstallWizard([appId])`. Its install workflow exposes the disk selection, Steam-owned confirmation and update/EULA/license dialogs. The same app-store action is used by the open-source Decky Xbox Dashboard plugin, with a direct `OpenInstallWizard([appId], "0")` fallback for the local Steam client.

## Implementation

- **Custom Game Details → Install** calls `openSteamInstallWizard(appId,nonSteam)`. No navigation to `/library/app/:id`.
- First use the real Steam install-actions store, identified by both the known `m_unAppIDExpectedInstall` member and callable `InstallApp` action. This is Steam's own UI workflow and can present the disk picker before install.
- If that store isn't exposed by the current SteamOS build, call `SteamClient.Installs.OpenInstallWizard([appId], "0")` to initiate Steam's own wizard.
- Validate an owned Steam game's numeric AppID and reject non-Steam shortcut IDs: Epic/GOG/Unifideck installers must not be falsely treated as Steam app installations.
- Steam handles location choice, disk space, entitlement and final confirmation. The plugin does **not** call `ContinueInstall`, select a folder or set Installed=true. Installation state is still read from Steam's actual inventory on the existing refresh.
- If the native API isn't available, show a concise error toast instead of silently opening the wrong game page.
- Playing an already-installed game remains unchanged.
- No changes to Store/HLTB URLs or history, Controller Settings, native cog/Start menu, layout, HLTB, page navigation or left-rail focus.

## MSI Claw validation

1. Open **a Steam-owned, not-installed game** via our custom Library → Game Details.
2. Press **Install** using A or touchscreen. Steam's genuine installation wizard should appear, not the original Steam Game Details.
3. With multiple Steam library locations/disks available, confirm Steam offers its location chooser; select the desired library.
4. Cancel the wizard and verify our custom Game Details stays available and the game is still marked uninstalled. Try again and confirm the download only when ready.
5. Check installed games still use Play; the previous working HLTB/Store/Controller Settings Back navigation and left rail focus must remain unchanged.
6. For an Epic/GOG imported shortcut, expect a clear non-Steam installer limitation rather than trying to install the shortcut through Steam's app wizard.

## Verification limitations

The TypeScript build and tests exercise the verified native install API, both dispatch methods, invalid AppIDs, native-failure feedback and absence of Steam details navigation. The physical MSI Claw must confirm the current SteamOS build actually displays the disk-selection dialog after dispatch. Selecting a location requires that Steam exposes more than one available Steam library location.
