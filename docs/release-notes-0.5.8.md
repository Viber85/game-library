Game Library v0.5.8 — first stable release after the v0.5.8 test series

Validated on MSI Claw A8 through v0.5.8-test.5, preserving the exact
Game Mode experience, Midnight colors, Steam and Decky native Settings
focus, controller navigation, Steam Input, Home/Game Details B return,
Steam/TabMaster/UnifiedDeck collections, HLTB/ProtonDB and SteamGridDB.

The test-series work improves React rendering, backend collection
and metadata fetching, native CSS alias compilation and source code
organization. This stable release adds only a final lifecycle audit,
clears the already-finished update-check timeout instead of keeping
it for 12 seconds, and removes one unused icon import.

No appearance editor, new controls, changed polling intervals or
new CSS rules. CI runs Python/Node regressions, TypeScript build
and verifies the installable ZIP. v0.5.8-test.5 remains available
as a rollback if device-specific issues appear.
