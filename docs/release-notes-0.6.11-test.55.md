# Game Library v0.6.11-test.55 — GOG storage picker and interrupted-download recovery

## Changes requested after MSI Claw testing

**Storage location:** GOG now opens a dedicated Decky/Steam-style modal when Install is pressed, rather than adding buttons directly beneath the game card. It lists internal storage and removable storage with available space, then requires confirmation. The native Steam InstallApp dialog cannot be used with a GOG product ID because Steam requires Steam game ownership and a Steam AppID; the new dialog matches the Steam selection flow while using GOG-specific installation logic.

**Download progress:** GOG now uses the same progress markup as Steam: header, thin 6px horizontal progress track, Cancel button beside the track, and downloaded size plus speed below. The earlier tall blue rectangle was caused by inheriting a `flex-basis:230px` in a vertical flex container. The corrected progress track has an explicit height and min/max height of 6px, keeping HLTB cards in position.

**Interrupted downloads:** GOG's downloader retains partial files after Cancel. Existing folders no longer cause a dead end:
- For installs recorded by Game Library, **Continue existing download** uses the same folder with `gogdl`'s own differential verification and downloads.
- An interrupted download from **test.54** has no ownership marker. Its folder is shown as *untracked*. The user can explicitly choose **Continue existing download**, which records the folder as their GOG installation before restarting the download. Only select this if it really contains that game's prior GOG download.
- **Start fresh — keep previous files** downloads into a distinct game-specific directory below `.game-library-restarts/` without deleting, moving, or overwriting the previous files. It can be used for completed/foreign or problematic folders.
- Each new managed download writes a non-secret, account/game-scoped marker so it can be recognized after a plugin restart, and maintains a separate provider-specific gogdl manifest directory instead of sharing Heroic or other launchers' data.
- Empty/zero-size GOG metadata now displays unknown rather than incorrectly showing `0.0 GB`.

## Existing functionality preserved

- Steam install/download and its native location picker, Pause/Resume/Cancel and uninstall UI are unchanged.
- GOG uses the official pinned `gogdl v1.4.0` tool, an independent authenticated service and store-scoped download state.
- Cancel still keeps partial files; the backend never runs a shell, recursively removes folders or silently adopts a preexisting installation.
- GOG Play, Proton setup, updates/repair, pause/resume and automatic background downloads after reboot are **not yet implemented**. Continuing the downloader may verify or re-download partial chunks depending on gogdl's manifests.

## Device validation

1. Open Captain Blood or another owned GOG game; press Install. Confirm the Steam-style storage selection modal opens, has no content below Install, and B returns to Game Details.
2. Confirm Install starts download and a 6px progress bar is shown, not the oversized rectangle.
3. Cancel during a small download; reopen Install on the same drive. The dialog should show **Continue existing download**. For test.54's partial files it should warn that the directory is untracked.
4. Confirm Continue uses the original folder; it must not delete existing files. Verify the percentage and downloaded bytes progress.
5. Choose Start fresh only if desired; prior files must remain, with the new download under a separate directory.
6. Confirm Steam Install and progress controls remain functional.

Offline Python tests cover marker isolation, explicit adoption, recovery after restart, untouched partial files and fresh installation; frontend tests cover the modal, controller focus, and fixed-height progress. The final visual and download behavior still require on-device verification.
