# GOG installation architecture — based on independently verified UniFideck and gogdl behavior

## Existing Game Library capability (v0.6.11-test.44)
- Own GOG account OAuth pairing + refresh, cached owned products and safe artwork loading
- Steam-style GOG Game Details page, including hero, GOG cover, title, HLTB
  and ProtonDB via title-matched real Steam metadata
- GOG identifiers remain store-scoped strings, not Steam AppIDs
- GOG Install is **visibly inactive** until the downloader backend is real.
  Do not claim installation, progress, ETA or Play prematurely.

## Technical reference
The open-source UniFideck project uses a packaged Heroic `gogdl` executable
from its own `bin/gogdl` (it does not call `SteamClient.Installs` for
GOG). The GOG provider's backend runs four ordered stages:
1. **Preflight:** validate the GOG session, downloader binary, storage path,
   available disk space, and game language / Linux or Windows build
2. **Download:** run the installed `gogdl` child process by argv (not through a
   shell); use its actual stdout to report live bytes and progress
3. **Verify:** check complete download and real executable, and repair an
   incomplete install without deleting an existing valid copy
4. **Register:** save a store-scoped install marker and add a launcher/Steam
   shortcut. Linux-native titles should use their start.sh entry; Windows
   titles launch through per-game Proton / UMU configuration.

UniFideck provides separate queued/running/finished download records and a
cancel method, keyed by `store:game_id`. Cancel of an active download
cancels its task, with a bounded wait. This is not the Steam download queue:
our Game Library must own the process, state, storage and cleanup.

## Implementation phases
### Phase 1: GOG details UI (included in test.44)
Reuse the Steam Game Details layout, with GOG hero and portrait cover,
per-title HLTB, ProtonDB title-match, tabs, and explicit GOG ownership.
No Steam IDs or synthetic play/installed state.

### Phase 2: Installed-state detection and official gogdl package
- Package a version-pinned, independently checked `gogdl` binary/zipapp;
  record version, hash and upstream GPL license.
- Bridge Game Library's own refreshable GOG OAuth session to gogdl's
  `--auth-config-path` JSON, without ever reading UniFideck's private data.
- Discover internal / SD card game directories; allow user selection.
- Confirm game supports Windows or Linux package, select language if available,
  and obtain verified download and required disk size before starting.

### Phase 3: Queue, progress, cancel, finalize, launch
- Python download supervisor owns a `gogdl download <product_id> --platform
  <windows|linux> --path <folder>` subprocess, with support-dir, language
  and DLC choices; never interpolate a shell command.
- Stream real progress and bytes via per-game RPC snapshots (pause/resume
  only after supported, reliable subprocess semantics are defined).
- Cancel the process group, check ownership of target folders before cleanup,
  and never delete a preexisting install or save prefix.
- On success verify real GOG files/executable, create own store-scoped marker,
  register a non-Steam Steam shortcut, configure Proton/UMU if necessary.
- Only then switch to **Play**. GOG games should stay visible in GOG and All
  Games, without borrowing Steam install/download or claiming Steam ownership.
- Add update/repair/uninstall, gamepad focus and reboot resume tests.

## Boundaries and licensing
The upstream UniFideck code is GPL-3.0-or-later. Reimplement our service
against the openly published gogdl CLI and adhere to the relevant licenses
rather than importing UniFideck Python modules or reading its credentials.
No shared database or dependency on UniFideck being installed.

## Reference
- https://github.com/mubaraknumann/unifideck/blob/staging/docs/architecture.md
- https://github.com/mubaraknumann/unifideck/blob/staging/py_modules/unifideck/stores/gog/install/installer.py
- https://github.com/mubaraknumann/unifideck/blob/staging/py_modules/unifideck/services/download/service.py
- https://github.com/Heroic-Games-Launcher/heroic-gogdl
