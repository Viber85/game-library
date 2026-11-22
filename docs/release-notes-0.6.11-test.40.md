# Game Library v0.6.11-test.40 — native Steam uninstall and Downloads ETA

## MSI Claw regression
Version test.39 displayed "Uninstall confirmation requested" but the game remained in Steam Downloads. The Time left field also showed "Estimating" while Steam's Downloads page had an actual estimate.

## Cancel: same confirmed operation as Steam's Library context menu
- Steam's own Uninstall confirmation handler invokes `SteamClient.Installs.OpenUninstallWizard([appId], true)` **after** the user agrees. Our previous `false` argument only asked the client to show a second confirmation; on this Game Library route the resulting Steam confirmation was not opening.
- For a **verified initial installation**, the Game Library Cancel button now opens its own explicit destructive confirmation. Only after the user approves, it directly calls `OpenUninstallWizard([appId], true)`, with no prior pause or `RemoveFromDownloadList`.
- **Updates** or unknown transfer types continue to use queue-only removal and never trigger an uninstall or prefix deletion.
- A native call returning void is not proof of completion. We check real native Steam transfer and installed state before Proton-prefix cleanup, retain the filesystem safety checks, and show status in-page rather than a misleading success notification.
- If Steam fails to remove the game, the inline error offers a controller-focusable **Steam options · Manage · Uninstall** fallback, which opens the actual native context menu used elsewhere in Game Library.
- Native calls have finite acknowledgement waits; the UI must not remain stuck on "Sending" or "Cancel requested".
- Prefix/shader-cache cleanup remains restricted to exact local AppIDs and occurs only after Steam confirms uninstall.

## Time left: use Steam's own Downloads estimate
- Prefer Steam's `DownloadOverview.overall_estimated_time_remaining_sec` for the currently selected *local* AppID. This includes Steam's overall install/update estimate.
- Fall back to `update_seconds_remaining` for clients exposing the download-only estimate.
- Ignore missing, nonpositive, invalid or remote values; do not invent a time. A paused or merely queued transfer has no active ETA.
- Downloaded/remaining bytes and the progress bar remain grounded in Steam's native values.

## On-device validation
1. Start a new small Steam download; while active, compare the Game Details Time left with the Steam Downloads page. It should be based on the same native estimate.
2. Press Cancel download, confirm **Uninstall game**, and verify the game actually disappears from Downloads and Steam storage. If it does not, use the inline Steam options fallback to invoke the original menu's Manage > Uninstall action.
3. Try canceling the confirmation: Steam download and any existing saves must remain untouched.
4. Test an update to an installed game: it must never uninstall the game.
5. Check controller focus, Steam Store/HLTB Back, progress bar and Pause/Resume.

Automated tests cover exact confirmation/argument call, update safety, remote and paused ETA, zero-estimate fallback and cleanup guards; actual MSI Claw SteamOS behavior must be confirmed on-device.
