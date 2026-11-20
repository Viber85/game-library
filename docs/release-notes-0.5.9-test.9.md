Game Library v0.5.9-test.9 — persistent Backlog & Completed (test release)

The existing Collections screen is unchanged at the hub level. Backlog and
Completed now support adding and removing any Steam or Steam-registered
non-Steam game via a controller-ready picker with the native SteamOS
TextField keyboard. Results are ordered A-Z and can be filtered by a game
title prefix. A toggles membership in the picker; pressing Y on a saved
game's poster removes it from that manual collection. Steam's native Start
game options and Game Details return continue to work.

Membership is saved atomically in Decky's own game_library.json settings;
it survives a Game Mode/Decky restart and is never stored only in browser
memory. Setting a game to Completed removes it from Backlog and vice versa.
Completion is never inferred from 0% achievements, playtime or missing data.
The saved preferences for Home, Midnight, SteamGridDB and other features
are preserved, and no native Steam/TabMaster collections are modified.

The four-card hub counts reflect saved assignments. Game picker starts
with alphabetically sorted titles and shows up to 80 choices at once;
enter a title to find an item outside the first 80. Existing Continue
Playing, My Collections, Home, Search, Appearance, Midnight and native
SteamOS CSS remain unchanged.

CI includes TypeScript checks, controller navigation and Python storage
tests. This is a test build; validate D-pad/A/B/Y, the SteamOS keyboard,
persistence after restart, and removing/moving games on the MSI Claw before
promoting to stable.
