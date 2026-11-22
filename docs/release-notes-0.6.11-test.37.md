# Game Library v0.6.11-test.37 — Compact progress bar and inline download controls

## Layout changes
- Shorten the per-game download progress bar to a maximum width of **340 px** (previously 460 px).
- Place **Pause/Resume** and **Cancel download** in the same upper row alongside the download status label and percentage, *above* the progress bar.
- Keep the real Steam download status, percentage, size/remaining GB, ETA, and gamepad-focusable controls.
- Use a wrapping flex header to accommodate narrower screen widths without clipping the controls.
- No changes to Steam installation/cancellation APIs, Proton prefix cleanup, or update safety protections.

## Test on MSI Claw
Open an actively downloading Steam game in our custom Game Details; verify that status and controls sit in the same row, the progress bar is shorter, and the downloaded/remaining-size/ETA readout stays below the bar. Confirm that controller focus reaches both controls and Steam's cancel confirmation still opens.
