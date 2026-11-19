# Game Library — final release audit, v0.5.8

## Baseline
v0.5.8-test.5 was confirmed working on the MSI Claw A8. This stable
release preserves its appearance, routes, Steam controller navigation,
native Midnight CSS, source integrations and existing background cadence.

## Static timer and listener audit
- `autoTabSource`: 4-second refresh interval, wake events and delayed
  follow-up are removed by `stopAutoTabSource`. Backend source uses
  generation checks to ignore in-flight responses after stop.
- `useRunningGameState`: 1.6-second running-game timer and Steam focus
  event are both removed during React unmount.
- `SystemStatusBar`: clock, Steam/device status, disk format and
  Steam live clock preference timers/listeners have corresponding
  cleanup in useEffect return functions.
- `RunningGameVisuals`: marquee animation-frame and ResizeObserver
  are cancelled/disconnected when the label unmounts or changes.
- `SelectedGameArtwork`: async completion guards avoid applying
  previous game selection's details after an effect is unmounted.
- `builtinThemeRuntime`: 6.5-second theme interval is stopped and
  native styles/watchers are cleaned up at plugin dismount. Do not
  alter the verified inject-before-remove CSS behavior.
- `index.tsx`: plugin dismount stops the tab/theme runtimes, removes
  patched routes and clears the control-panel subscribers.
- `sortMetadata`: cancellation checks stop work after in-flight
  requests, and the short network pacing delays are naturally bounded.
- `UpdatesPanel`: the local timeout used to remain active for
  up to 12 seconds even when a GitHub request settled. Replace with
  `withRequestTimeout`, which clears its timer upon success or error.
  Deadline remains 12 seconds; release validation is unchanged.

This is a **source-level lifecycle audit**, not a claim that memory
usage has been profiled or all runtime leaks ruled out. No need was
found to change existing SteamOS polling or CSS runtime while the
last test build is confirmed working.

## Minimal code cleanup
Remove the proven unused `MdStar` icon import from `Dashboard.tsx`.
Keep native Steam/Decky theme helpers and diagnostic CSS intact:
their real use depends on a specific route and gamepad focus state.

## Release checks
The existing Node controller/grid/focus/theme tests, Python backend
tests, native CSS checks and ZIP packaging run in GitHub Actions.
New regression cases cover the updater's deadline handling and
existing timer/unmount cleanup contracts.

Stable package v0.5.8 is assembled from the same installed theme
and controller logic as user-verified v0.5.8-test.5. This change
contains no new UI or Appearance color editor.
