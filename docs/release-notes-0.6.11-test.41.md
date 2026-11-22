# Game Library v0.6.11-test.41 — open Steam's original Uninstall confirmation directly

## MSI Claw feedback
After the v0.6.11-test.40 update, the `Time left` estimate works. However, Cancel download still required an intermediate Game Library confirmation and did not show the actual Steam Uninstall window. The user showed the exact requested native dialog in screenshots, accessed through Steam context menu > Manage > Uninstall.

## Change
- **Cancel download on verified new Steam installations directly opens Steam's original Uninstall confirmation modal**. It now uses Steam's own UI modal entrypoint with the AppID, target window, and `bConfirmPassword=false`, not `OpenUninstallWizard` or a replica `ConfirmModal`.
- The actual native modal has Steam's original **Uninstall** and **Cancel** choices. Steam's native confirm handler itself calls `SteamClient.Installs.OpenUninstallWizard([AppID], true)` only when the user selects Uninstall.
- No intermediate popup, no prior PauseAppUpdate, no RemoveFromDownloadList, no unconfirmed prefix deletion.
- The helper discovers the uniquely identified Steam webpack export from the `rgApps`, `bConfirmPassword` and `bNeverPopOut` markers. If a SteamOS version changes that private UI component, a status message links to the already functioning **Steam options > Manage > Uninstall** context menu instead of silently destroying content.
- Cancellation of **updates** and uncertain transfer types retains the existing safe queue-removal confirmation and never uninstalls an installed game.
- The native install/download observer and guarded Proton cleanup remain unchanged: deletion checks only run after Steam visibly removes the app.
- Download progress, downloaded/remaining GB, Time left, 340px progress bar, Pause/Resume, Store/HLTB and gamepad navigation are unchanged.

## MSI Claw verification
1. While `Achilles: Survivor` is partially downloading, press **Cancel download** on Game Details. The **exact original Steam Uninstall window** should appear immediately, like the previously supplied screenshot, with its native Uninstall and Cancel buttons.
2. Select native **Cancel**. Steam Downloads should remain unchanged, and no Proton cleanup should run.
3. Press **Cancel download** again and choose native **Uninstall**. Verify Steam removes the game from the local Downloads list and installed storage.
4. Try Cancel on an already-installed game's update: it must NOT open an uninstall dialog.
5. Check existing working Time left and the vertically aligned Pause/Cancel row.

Automatic tests cover the UI dispatch, native modal export identification, AppID guard and no-premature-delete behavior. The exact SteamUI webpack export is private and requires on-device validation.
