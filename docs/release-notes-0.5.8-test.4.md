Game Library v0.5.8-test.4 — performance-only Midnight CSS runtime update

- Resolve Steam webpack CSS class aliases ONCE per Steam tab synchronization
  instead of once for every Home/QAM/Main Menu browser tab.
- Cache class-alias-expanded Midnight styles only until a referenced live
  class mapping or the underlying CSS changes. Lazy-loaded Settings,
  Game Details and Steam Input editor class hashes still trigger automatic
  recompilation and safe reinjection.
- Avoid redundant Decky theme-status subscriber updates if no status field
  changed. The existing 6.5-second live verification remains active.
- Keep existing atomic CSS replacement, verified marker checks, native
  watcher snapshots, controller focus rules and SteamOS/Decky CSS identical.
- No Appearance changes. Full CI tests/typecheck/ZIP required; confirm on
  MSI Claw before treating this pre-release as stable.
