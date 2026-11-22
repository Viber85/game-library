# Game Library v0.6.11-test.39 — Steam-native Uninstall fixes Cancel and aligns controls

## MSI Claw feedback
Cancel download left **Achilles: Survivor** at "Paused – 19%", showed a clipped bottom-right toast, and reported that Steam still had installation files on disk. The earlier implementation first called `PauseAppUpdate` and `RemoveFromDownloadList`, then attempted to uninstall. Steam's RemoveFromDownloadList only unschedules the item; it does not delete the partial installation.

## Native Cancel behavior
- For a verified **new installation**, invoke **exactly the underlying Steam Uninstall operation**, `SteamClient.Installs.OpenUninstallWizard([appId], false)`, with its **native confirmation**. **Do not pause or remove from the download queue first**.
- Opening Steam's confirmation is not proof that the player confirmed uninstall. The custom UI does **not** immediately start deleting the Proton prefix.
- Once Steam itself reports that the local app is no longer installed **and** the download transfer is gone for a stable interval, the existing guarded backend may check for removal and clean only that AppID's `compatdata/<AppID>` and `shadercache/<AppID>` after Steam releases all recognized library manifests and downloading directories.
- If Steam's native dialog is dismissed, the download remains and no cleanup is automatically authorized. Cancel-request state times out; it can be retried without hanging the UI.
- For an existing game's **update** or unknown install type, keep the safe queue-removal action; **never call uninstall or delete the installed game's prefix**.
- Preserve app ID checks, response timeouts, pause/resume and all other working library behavior.

## UI/UX
- **Pause / Resume** and **Cancel download** are now **vertically centered in the same row as the 340px progress bar** rather than above it.
- Real download status and percent remain above, and downloaded/remaining GB and ETA remain below.
- Cancel messages are shown in a readable, wrapped inline Game Details status, **not an off-screen / clipped bottom-right toast**. The UI distinguishes opening the native uninstall dialog, verified download removal and cleanup success/failure.

## Claw validation
1. Start an uninstalled Steam game and use Cancel download. Verify **Steam's own Uninstall confirmation** appears; decline it once and confirm no deletion.
2. Repeat, confirm Uninstall, and check the game actually disappears from Steam Downloads/Storage (not merely becoming "Paused").
3. Watch for an inline cleanup confirmation only after the native uninstall is finished; prefix deletion is not claimed if Steam keeps files busy or cannot be verified.
4. Check that Resume and Cancel buttons are level with the shorter bar and readable with gamepad navigation.
5. Verify that Cancel on an **update** does not uninstall an existing game, and Store/HLTB Back still work.

Unit tests verify native Uninstall is called directly, update safety, no pre-removal, deferred cleanup and compact layout; physical Claw behavior still needs confirmation.
