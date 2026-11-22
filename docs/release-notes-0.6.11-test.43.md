# Game Library v0.6.11-test.43 — direct Steam uninstall protocol on Cancel

## Why Cancel previously opened a menu
The Steam Game Mode context-menu action calls an internal React modal function that expects Steam's own UI context and owning window. Calling that private component directly from Decky crashed the MSI Claw SteamUI with `TypeError: Cannot read properties of undefined (reading 'client_name')`.

The v0.6.11-test.42 recovery deliberately routed through the safe context menu, but it required manually selecting Manage > Uninstall.

## New direct, native path
Steam supports a dedicated **`steam://uninstall/<AppID>`** protocol route. Decky's Steam client types expose `SteamClient.URL.ExecuteSteamURL(url)` specifically for dispatching `steam://` URLs.

- **Cancel download** for a verified first-time Steam installation now directly calls `SteamClient.URL.ExecuteSteamURL("steam://uninstall/" + appId)`. The client owns the uninstall confirmation and deletion: **no private Steam React modal import, no menu traversal and no automatic file deletion on dispatch.**
- Only validated, positive local Steam AppIDs (not non-Steam shortcuts) are accepted. No app name, file path, shell, process or externally supplied URL is used.
- If `SteamClient.URL.ExecuteSteamURL` is missing or throws, the existing, already-tested native Steam game context menu opens as a safe fallback; the user can then choose **Manage > Uninstall**.
- A void API response means only **request dispatched**, not that the uninstall succeeded. Proton prefix/shader cleanup remains guarded by the separate observer and backend and runs only once Steam removes the local installation.
- Already-installed game updates and unverified transfer types retain queue-only cancellation; existing games and saved data are not intentionally uninstalled.
- Working download progress, Steam Time left, Pause/Resume, 340px bar and gamepad UI are unchanged.

## Verification on MSI Claw
1. Begin or pause a **new Steam install**, press **Cancel download** once.
2. Verify Steam presents the native Uninstall confirmation without first opening the Manage submenu and without crashing Game Mode.
3. Choose **Cancel** inside Steam's dialog: the download should remain unchanged.
4. Repeat and choose **Uninstall**; confirm Steam actually removes the transfer and installation.
5. Compare the Time left value during an active download and confirm Pause/Resume remain functional.
6. For a game update, Cancel must not call the uninstall protocol.

**Caution:** The protocol is supported by Steam generally, but the MSI Claw SteamOS behavior has not yet been physically confirmed. This release explicitly avoids the known crash-prone private React component approach.
