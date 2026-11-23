# Game Library v0.6.11-test.53 — Steam native download speed

The Game Details installation progress panel now displays **Speed** next to Downloaded, Remaining and Time left, with live readings such as `42.5 MB/s`.

### Source and correctness

- Uses `update_network_bytes_per_second` from Steam's existing `SteamClient.Downloads.RegisterForDownloadOverview` / native DownloadsStore overview; no Downloads-page navigation or screen scraping.
- Shares the read-only Steam download snapshot already used for download progress, native ETA and Pause/Resume/Cancel. The snapshot's existing 1-second refresh also updates speed.
- Validates `update_appid` and rejects remote clients, finished transfers, and paused/queued overview data. The displayed value is only for the **currently selected local Steam game**.
- Speeds are native bytes/s formatted as MB/s or KB/s. Missing, invalid, paused or queued rates show `—`, not an invented estimate; a real zero is shown as zero.
- Snapshot equality includes speed so the UI re-renders when the Steam network rate changes even if byte totals have not moved.

### Scope

Steam Game Details only. No changes to the GOG disabled-install placeholder, Steam download/installation actions, progress bar, native uninstall, hero/layout or gamepad focus.

### Tests / device verification

Automated tests verify current-rate parsing, selected-AppID isolation, remote and paused rejection, invalid values, zero handling, formatting, UI wiring, and event-driven snapshot updates. The metrics tests run in the same CI navigation suite as other download checks.

On the MSI Claw, start a Steam game download and compare **Speed** to Steam's Downloads page. Pause and Resume should change the displayed rate accordingly. No download functionality is modified.
