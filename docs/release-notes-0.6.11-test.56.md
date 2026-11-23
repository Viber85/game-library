# Game Library v0.6.11-test.56 — GOG direct recovery actions and Pause/Resume

## Changes after MSI Claw tests

- **Continue existing download** now actually starts the GOG download when activated. Previously, this button only selected a mode and quietly required another confirmation click; the new action calls the backend immediately.
- **Start fresh — keep previous files** also starts the download immediately, into a new, isolated folder. The previous partial files are never deleted. Errors remain visible within the modal so a failed backend call no longer looks like an inert control.
- The modal's lower **Install** confirmation is shown only for an empty game directory. For a directory containing prior data, Continue and Start fresh themselves are the two actionable choices.
- **Pause** and **Resume** join Cancel beside GOG's native 6px progress bar, matching the placement used by Steam. The GOG downloader is an owned child process group created with `start_new_session=True`; the backend pauses it using Linux SIGSTOP and resumes the **same process** using SIGCONT. Cancel and plugin unload wake a paused process before sending SIGTERM so no stopped worker is left behind.
- While paused, current speed is displayed as unknown (—), progress and downloaded-byte state remain available, and the Install button shows Paused N%.
- Paused downloads are treated as active jobs and cannot spawn a duplicate install.
- A download that is cancelled is never marked as completed, even if its process happened to exit cleanly during cancellation.

## Notes and limitations

Pause/Resume is **live-process control**, not a persistent paused queue. A plugin update, restart, or crash ends the running downloader; re-open Install and use **Continue existing download** to resume a partial install from disk. The downloader itself may need to verify or re-fetch incomplete chunks when restarted. The Steam installer, install location picker and download controls have not been touched.

## Test on MSI Claw

1. Open a GOG game with an interrupted download. Choosing **Continue existing download** should immediately close the modal and show Preparing/Downloading, with no second confirmation needed.
2. Choosing **Start fresh** should immediately start a download in a new folder, keeping the previous partial files intact.
3. Pause an active GOG download. Check that transfer activity stops and the UI says Paused, then resume and confirm the same download proceeds.
4. Cancel while paused, then open Install and check that it can continue from the folder.
5. Back, controller focus, HLTB layout, Steam installs, and native Steam download controls should remain unchanged.

Source-level and Python signal-state tests run in GitHub Actions. The actual signals and controller interactions require on-device verification.
