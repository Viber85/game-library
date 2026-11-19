Game Library v0.5.9-test.4 — Move Search from status bar into left navigation

The Search icon is now a dedicated left-rail entry directly after Library,
before Appearance. This keeps the rail's Running Game (conditional), Home,
Library, Search, Appearance and Steam Menu order. The search icon is
removed from ALL Game Library status bars; Steam notifications become
the first focusable status button and D-pad Up from Library still works.

Entering Search from the rail opens the existing local unified search.
While already on the Search route, pressing A or Right from its navigation
item focuses the query input instead of reloading the page. Search is
correctly highlighted in the rail rather than Library.

No changes to search algorithms, Epic/GOG source detection,
SteamOS on-screen keyboard, filters, game cards, native Start/Details
or saved query. Appearance sections/Color Editor, Midnight and native
Steam/Decky CSS remain unchanged. Automatic tests/typecheck/ZIP pass
before publishing; confirm on MSI Claw.
