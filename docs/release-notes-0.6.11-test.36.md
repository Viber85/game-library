# Game Library v0.6.11-test.36 — Download details, Pause/Resume and safe Cancel

## Display
- Under the real Steam download progress bar, display **Downloaded X / Y GB**, **Remaining Z GB**, and **Time left**.
- Use actual Steam DownloadOverview / queue / per-client byte fields and Steam's remaining-seconds estimate. Size represents the *network download*, not disk space required after install. No guessed numbers: unknown ETA reads "Estimating"; unavailable bytes are omitted.
- Compact, controller-friendly readout retains the Midnight layout.

## Native controls
- **Pause** calls only the selected Steam AppID's native `SteamClient.Downloads.PauseAppUpdate(appId, "0")`.
- **Resume** calls `ResumeAppUpdate(appId, "0")` when Steam reports the transfer paused or queued.
- **Cancel download** requires Steam's own controller-compatible `ConfirmModal` before acting. It pauses the selected AppID and removes its entry with `RemoveFromDownloadList(appId, "0")`.
- **Initial installation only** (verified from Steam `update_is_install` or queue `buildid === 0`): additionally calls Steam's native no-extra-prompt `OpenUninstallWizard([appId], true)` after the user's confirmation, letting Steam itself delete the partially downloaded/installed game.
- After a confirmed initial-install cancellation, the packaged Decky Python backend waits for Steam to release *all recognized library manifests/download folders*, then deletes only `steamapps/compatdata/<AppID>` (Proton prefix) and `steamapps/shadercache/<AppID>`. This may irreversibly delete local-only saved games and is stated explicitly in the modal.
- Installed game **updates** and ambiguous transfer types never trigger uninstall or prefix deletion. They are only removed from the Steam download queue.
- Plugin refuses arbitrary filesystem paths, other-device AppIDs, non-Steam shortcuts, symlink targets, and cleanup while Steam still owns installation data. No global Pause downloads calls; other games are untouched.
- A confirmation that goes stale due to a change in download type or completion is rejected without uninstalling anything.
- Cleanup failure or an unknown/unmounted Steam library is reported honestly. Steam's own downloads and installation routines remain authoritative.

## MSI Claw test
1. Start downloading a small uninstalled owned Steam game. Verify downloaded GB / total download GB, remaining GB and time left (or "Estimating" if Steam has no ETA).
2. Press **Pause** and confirm Steam Downloads also pauses, then **Resume** and check it continues.
3. Press **Cancel download**. Read the destructive warning about the exact game's prefix and local saved-game data. Press **Keep downloading** to ensure no action.
4. On a new install, confirm Cancel. Check Steam cancels and uninstalls, and the plugin reports whether the exact AppID's compatdata/shadercache cleanup completed. If Steam remains busy, cleanup is intentionally withheld.
5. An update to an already-installed game must **not uninstall the game** or delete its Proton prefix.
6. Confirm Store, HLTB, controller navigation and installed-game Play still function as before.

Automated Python tests exercise destructive path guards and blocked cleanup, while Node tests exercise native actions, transfer classification and byte/time display. Physical SteamOS validation is required for live API behavior and installed storage layout.
