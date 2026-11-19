Game Library v0.5.8-test.5 (test release)

Conservative maintainability refactor. Move selected-game hero and
logo, running-game icon and marquee, and sort progress UI out of the
large Dashboard into dedicated components without altering their
behaviour. Isolate the existing 1.6-second running-game status poll into
a dedicated React hook; its equality guard and event cleanup are kept.

No changes to GameCard/controller focus, grid, Steam and Epic/GOG tabs,
artwork priority, HLTB, ProtonDB, SteamGridDB, Settings/Decky CSS,
Steam Input or Midnight colors. Appearance editing remains postponed.

Expanded regression tests for component wiring, controller behavior,
metadata status, artwork and running-game navigation; full CI,
TypeScript build and install ZIP. Verify on MSI Claw before stable.
