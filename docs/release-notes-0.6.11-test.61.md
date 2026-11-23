# Game Library v0.6.11-test.61 — find locally installed Proton on newer SteamOS

## MSI Claw result after test.60

Steam successfully created the Commandos: Behind Enemy Lines shortcut and Game Library registered it. The next step failed: **“Steam shortcut created, but no Proton tool was returned by Steam.”** This is an installed-tools enumeration issue, not a game download or shortcut registration issue.

Recent Steam Game Mode clients have `SteamClient.Apps.SpecifyCompatTool` while no longer exposing `SteamClient.Apps.GetAvailableCompatTools` or `SteamClient.Settings.GetGlobalCompatTools`. The previous implementation required the removed enumeration methods and therefore never called the still-available setter.

## Changes

- Added a **read-only backend compatibility-tool scanner** for Proton installations in the Steam user's `steamapps/common` and `compatibilitytools.d`. This discovery does not depend on either missing JS enumeration API.
- It lists Valve's Proton Experimental, Proton Hotfix and versioned depots only when actual launcher and tool manifest files are installed; their known internal Steam compatibility names are used.
- Custom Proton builds must contain their `compatibilitytool.vdf` with the actual internal Steam tool key plus a Proton launcher, not merely a folder with “Proton” in its name.
- Installation paths are not transmitted to Game Mode UI, and no Steam files are edited. Scan results only include validated Steam tool IDs, labels and provider type.
- `configureGogPlay` still prefers Steam-reported tools if available, but falls back to this local installed list when Steam no longer exposes enumeration methods; it then uses the existing `SpecifyCompatTool` API, preserves the existing Steam shortcut, and records Proton only after its API call returns without error.
- Offline tests cover Valve/custom installations, invalid/partial files, symlinked Steam root, deduplication, and privacy. A frontend regression test confirms the fallback is reachable and included in the ZIP.

## On-device check

1. Install `v0.6.11-test.61` and open Commandos → Set up Play → select `comandos.exe` → Configure with Proton.
2. If Proton Experimental or a versioned Proton is installed under Steam, the scanner should now supply its internal tool ID and setup should proceed without the previous “no Proton tool returned” error.
3. If setup reports ready, open Steam's non-Steam shortcut Properties → Compatibility and check that a Proton tool was actually selected. `SpecifyCompatTool` does not offer a strong success result on every Steam client.
4. Launch Commandos and confirm it actually starts. Do not remove already created Steam shortcuts unless a specific duplicate is confirmed.
5. If the scanner finds no installed tool, check Steam's Tools library/Compatibility settings. The message now distinguishes unavailable local installs from the missing Steam API.

Steam installation, GOG downloads and other existing functionality are unchanged.
