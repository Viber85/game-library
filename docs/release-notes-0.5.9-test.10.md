Game Library v0.5.9-test.10 — durable Backlog & Completed and focus refinement

Backlog and Completed now have a controller-ready "Add games" action.
The picker uses SteamOS's native TextField with local title-prefix search
and A-Z selection, works for Steam/Epic/GOG games registered in Steam and
does not rely on remote game search. A toggles membership, Y on a
Backlog/Completed poster removes it, B goes back, and left-rail focus
returns to the correct control even while the picker is open.

Assignments persist in Decky's game_library.json preferences across
Game Mode and plugin restarts. A completed title leaves Backlog and
vice versa. This does not edit Steam/TabMaster collections, and never
infers completion from achievements or playtime. Existing Home,
Search, Continue Playing, My Collections, Appearance, Midnight,
Settings and QAM styling are unchanged.

The four Collections cards show accurate saved manual counts. If
there are more than 80 items in the game picker, type a title prefix
to filter the complete Steam library. The picker has an explicit
loading state and lazy cover art.

CI validates Python persistence, TypeScript/rollup, D-pad regression
and package structure. Test in Game Mode on MSI Claw: native keyboard,
A/B/Y, rail focus, move from Backlog to Completed, survive reboot,
Game Details back-return. This remains a prerelease until verified.
