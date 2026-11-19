# Game Library v0.5.8-test.2 — status-render cleanup

This small release follows v0.5.8-test.1. The last functioning Midnight
layout, focus, controllers, Steam routes and native CSS remain untouched.

## Changes

- The displayed clock remains updated every 15 seconds and retains its
  Steam live 12/24-hour preference. The timer now belongs to
  `SystemStatusBar` instead of the full `Dashboard` component, removing
  an unrelated full-library React update.
- React status state changes only when any **displayed** battery, charging,
  Wi-Fi, Bluetooth, avatar or unread-count field differs. The status poll
  intervals (12s device, 5s Steam, 15s disk clock-format, 2s live
  preference) remain unchanged. Failed device-status reads still show the
  original unavailable fallback.

## Non-regression checks

- Exact device field-by-field equality with change cases.
- Steam avatar/unread updates preserved.
- Dashboard timer stays at 15 seconds and membership/TabMaster/UnifiedDeck
  checks are unchanged.
- Steam native CSS, controller maps, current focus handlers, layout,
  running-game rail and Game Details B return remain unchanged.
- Mandatory Node and Python/Decky packaging checks run in GitHub Actions.

This release intentionally defers CSS caching, collection processing and
GameCard memoization to separately testable changes. No Appearance work.
