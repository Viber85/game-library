# Game Library v0.6.11-test.35 — Steam install progress race fix and native queue diagnostics

## Report from MSI Claw
After v0.6.11-test.34 opened the correct Steam install wizard, confirming the install still returned to a Play button without the actual download's progress.

## Verified defects in test.34
1. `resolveGameTransfer` explicitly ignored *all download callbacks* when an app overview reported `ReadyToLaunch` (11). Steam's installed/ready flags can change before the native transfer disappears.
2. Percent extraction expected `overall_percent_complete`. Steam's native `DownloadOverview` and per-content updates can instead expose real `progress[]` byte counters.
3. Only the global `window.downloadsStore` was read as a store snapshot; some Decky routes may not expose it even though Steam's own download store exists as a webpack module.

## Changes
- Native download queue/active transfer **overrides ReadyToLaunch**. Only when the Steam queue and active download have completed and the native app status is ready will the primary button show **Play**.
- Calculate percentage from Steam's actual bytes in `progress[]`, `downloaded_bytes/total_bytes`, or `update_bytes_downloaded/update_bytes_to_download` when no direct percent is available. Percent remains unknown if Steam reports none.
- Subscribe to native download callbacks with compatibility for both one-array and two-argument callbacks; use the verified Steam `DownloadsStore` by webpack lookup as a read-only fallback, plus local client ID 0 filtering.
- Following the installation wizard, an unconfirmed download does not change to Play just because an arbitrary 15-second timer elapsed.
- In **Game Info** show a small native diagnostics line: AppID, Steam display status, local installed flag, callback delivery, native store availability, whether a local queue item was found and progress. This is to distinguish Steam data/Decky context problems on real hardware.
- The native install wizard, Steam Store/HLTB Back, Controller Settings and gamepad navigation are unchanged.

## MSI Claw test
1. Open an uninstalled owned Steam game in our Game Details, choose Install and confirm the real Steam installation.
2. Compare our new progress indicator with the Steam Downloads screen.
3. If we still show Play or Checking, open the **Game Info** tab and take a photo or copy the Steam download diagnostics text. Check whether Steam Downloads is still actively downloading the same AppID.
4. Also test a paused/queued download and a finished game; Play should appear only after installation is ready.
5. Cancel a new install and verify the Steam app status. The final cancel/confirmation behavior remains to be validated on the physical device.

The automated tests prove the parser, priority and regression logic with controlled Steam payloads, not the exact current SteamOS payload on the Claw.
