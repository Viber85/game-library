# Game Library v0.6.11-test.34 — Native install/download progress on custom Game Details

## Confirmed on MSI Claw
The test.33 **Install** action successfully opens Steam's real drive/location chooser. After confirming installation, our Game Details incorrectly switched to **Play** before the Steam download finished; pressing Play then returned to the original Steam Game Details screen.

## Fix
- Custom Game Details now listens to the **selected game's** native `SteamClient.Downloads.RegisterForDownloadItems` and `RegisterForDownloadOverview` callbacks.
- Reads the local client (ID **0**) in newer grouped SteamOS download lists, with a legacy flat-list fallback. Remote-device downloads are never mistaken for local installs.
- Shows a compact, live **progress bar and percentage** directly below the action row while Steam reports that game's transfer. Queued, paused, downloading, installing, verifying and updating states are distinguished.
- Steam's per-client `display_status` is used as a fallback when a queue callback contains no percentage. In that situation the UI explicitly says **Waiting for Steam**, not a made-up percent.
- An app's simple `installed` boolean no longer overrides a running or queued installation. The Play button is withheld until Steam reports the transfer is complete / ReadyToLaunch, and no longer navigates to native details while a download is underway.
- Following the install wizard, the button briefly reads **Preparing...** while Steam establishes its download queue. Canceling the wizard does not permanently trap the interface in that state.
- No install actions are sent by the progress observer. Steam itself controls file location, ownership, queue, download, disk work and installation completion.
- Existing HLTB and Steam Store navigation/Back, Controller Settings, game options, Library navigation and installed-game launching remain unchanged.

## Device verification
1. Start an **uninstalled owned Steam game** from our custom Game Details, select a location and confirm installation.
2. On returning to custom Game Details, check **Downloading / Queued / Installing** and the native progress bar (percent if Steam supplies it), rather than Play.
3. Check that the percentage changes as Steam's Downloads page advances; no generated percentage is shown if Steam reports none.
4. Pause or queue the download via Steam's Downloads page: our label should update. Finish the install: the action should turn into Play once ready.
5. Cancel a fresh wizard: no phantom download or permanent Preparing state.
6. Open Store and HLTB and return with B, and verify controller focus and existing game launch still work.

## Verification scope
The new pure parsing tests cover legacy/grouped Steam callback formats, local vs remote AppIDs, actual percent/unknown percent, queued/paused/completed transfers and premature Play prevention. The Github CI build/typecheck confirms packaging; only on-device testing can validate the latest SteamOS callback shape and progress refresh timing.
