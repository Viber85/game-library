Game Library v0.5.9-test.8 — Collections screen (test release)

User-requested new Collections icon on the left rail after Search and
before Appearance. The Game Library Collections route presents four
large cards in a controller-focused 2x2 layout:
- Continue Playing — games with verified recent Steam play activity in
  the last 30 days. Open a grid, game details and native Start options.
- Backlog — dedicated view, initially empty until manually assigned.
- Completed — dedicated view, initially empty; never falsely infer
  completion from unreliable missing achievements or playtime.
- My Collections — list existing user-defined Steam / TabMaster tab
  groups (excluding built-in store/source tabs) and view their games.

The Collections route has the same Game Library statusbar and scoped
native-header suppression as Library/Search/Appearance. A/B/D-pad
navigation and details return are controller-focused. The icon always
opens the four-card hub; a native Steam Game Details return preserves
the previously selected collection page in memory.

No persistence or editor for manual Backlog/Completed yet; that is the
next planned increment. No UI changes to Search, Appearance, Midnight,
game sort or original Steam/Decky Settings. Full CI and packaged ZIP
required before prerelease; on-device test needed before stable.
