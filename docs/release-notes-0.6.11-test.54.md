# Game Library v0.6.11-test.54 — first real GOG installer

## What's implemented

- GOG Game Details **Install** now runs a GOG-only preflight: verifies the game is owned by the connected GOG account, checks the bundled official `gogdl` CLI and its SHA-256, obtains actual Windows download metadata / disk size, and lists eligible internal/SD storage targets.
- Location selection appears inside the existing reserved download area, using Decky's native controller-focus controls.
- Confirm starts a real, per-account/per-title `gogdl download` subprocess with shell disabled. Progress, bytes and current rate are parsed from official downloader output and displayed in the same Game Details area.
- Cancel targets only the plugin-owned process group and keeps partial files. No automatic deletion of downloaded game files, Steam prefixes or installed games.
- Existing Steam Game Details/download/Cancel/Uninstall actions remain untouched.
- Newly downloaded Windows GOG titles are labeled **Downloaded · launch setup pending**. Do not show Play until actual Proton/UMU launcher creation and executable verification are implemented.
- If `gogdl` returns no valid game data, no storage is writable, or authentication is unavailable, Install reports an actionable failure instead of fake success.

## Bundled GOG downloader

The install ZIP includes the official Heroic `gogdl` Linux x86_64 v1.4.0 release asset (SHA-256: `2aa2b59c83d3bfbe7b60ead91c6297b263b5d1e6c233a04b7409bafe26738f02`). The package build validates the upstream release hash and includes the upstream GPL-3.0 license file. Upstream project and source: https://github.com/Heroic-Games-Launcher/heroic-gogdl (tag v1.4.0).

This implementation uses the connected Game Library GOG account's current access/refresh tokens, copied into a separate 0600-permission, account-scoped `gogdl` auth file owned by the real SteamOS user. It does not access Heroic or UniFideck data.

## Scope / limitations

- First test release downloads the **Windows** build of a game, without optional DLCs. Linux-native builds, language/DLC selection, persistent download queue across plugin restarts, pause/resume, game launching/Proton, updates/repair/uninstall and achievements are future work.
- A plugin restart or update stops processes that this plugin owns, leaving partial files in place. Reinstall to an occupied game folder is currently refused to prevent unwanted overwrites; managed resume/repair is not implemented.
- Game install metadata and correct SD card discovery depend on the local SteamOS mounts and GOG account. Test with one small game on-device before larger downloads.

## Manual MSI Claw tests

1. Open a GOG-owned game, choose Install and confirm the reported size and Internal/SD locations.
2. Download a small Windows title; verify real progress, size and speed while navigating without focus jumps.
3. Cancel mid-download and confirm existing game folders and Steam libraries are untouched.
4. Verify account isolation, missing-SD handling and failed authorization messages.
5. Verify a completed game remains labeled Downloaded (not playable) until we implement its launcher.
6. Verify Steam native Install, Pause/Resume/Cancel and uninstall confirmation still work.

CI provides offline security, source-level and packaging checks. The downloaded title's actual installation and runtime behavior require testing on your MSI Claw.
