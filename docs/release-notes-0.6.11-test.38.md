# Game Library v0.6.11-test.38 — Fix Cancel download stuck on Working

## Fix for reported MSI Claw behavior
In test.36/.37, **Cancel download** could stay on **Working...** even after the user's confirmation. Two operations were awaited inside the same busy state:

1. Steam's native Pause / RemoveFromDownloadList / OpenUninstallWizard calls can return pending promises rather than completing promptly.
2. The Decky backend's Proton-prefix cleanup deliberately polls Steam's uninstall state for up to 30 seconds. That safe filesystem cleanup should not lock the controller UI.

## Changes
- Set a bounded native Steam-command acknowledgement window (2.5 seconds each). If a native promise never settles, the action can continue; its dispatch is **not** misrepresented as verified completion. Synchronous exceptions and explicit RPC rejections are still reported.
- After Steam receives Cancel, release the **Sending...** state without waiting for the Proton-prefix cleanup. Native app uninstall and exact-AppID prefix/shader-cache cleanup still run, but completion/partial failure is reported by a separate toast.
- Change **Working...** to **Sending...** while submitting; then **Cancel requested** until Steam's download observer removes that game from the active list.
- If Steam still reports the download after 12 seconds, clear the temporary Cancel-requested state, warn the user to check Steam Downloads, and permit retry. The UI must not remain permanently locked.
- Bound the backend-response wait to 38 seconds and report unconfirmed cleanup honestly. Never assert a prefix was deleted without the backend confirming it.
- Retain per-AppID safety: updates and unknown install types do **not** uninstall the existing game or delete its Proton prefix, and Cancel still requires a destructive confirmation for a verified fresh installation.
- Keep test.37 layout: 340 px progress bar, Pause/Cancel beside status and percent, transferred/remaining size and Steam ETA below.

## Regression tests
- Never-resolving Steam native commands finish within a short bounded test window and do not trap the controller action.
- Rejected RemoveFromDownloadList never invokes uninstall or claims success.
- UI cancellation logic releases the busy state independently of the slow prefix-cleanup RPC.
- Full Game Library controller, CSS, typecheck and packaging checks unchanged.

## Device validation
1. Start downloading an uninstalled Steam game. Press **Cancel download** and accept the confirmation.
2. The button should show **Sending...** briefly, then **Cancel requested**, rather than freezing at Working.
3. Verify the same download actually leaves Steam's Downloads page and the native Steam uninstall removes its partial installation. The app's Proton prefix is removed **only if** the backend can verify that Steam has released the game files; otherwise an explicit warning is shown.
4. Test Pause / Resume and ensure another game's download is unaffected.
5. If Steam still shows the download after the cancellation request, please report the exact message and the diagnostics from Game Info. Passing automated tests does not guarantee the native SteamOS build accepts every cancel RPC.
