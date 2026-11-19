Game Library v0.5.9-test.3 — integrated game search (test release)

Game Library's magnifier now opens a first-party, controller-friendly
Search page in Game Mode, NOT native Steam Search. The search queries
Steam's already available game inventory (including registered
UnifiedDeck Epic/GOG shortcuts), never a remote provider or API.

- Live, case/diacritic-insensitive title search (multiple terms allowed).
- Source filters: All / Steam / Epic / GOG / Other, sourced from actual
  Unifideck native collections, not shortcut-name guessing.
- Availability filters: Any / Installed / Not installed.
- Existing game covers, Start native options, Game Details, Sort and
  scalable full grid with controller D-pad focus remain in use.
- Preserve search text, filter choices and previous Game Library route
  when opening and returning from native Game Details.
- Input uses Decky TextField to support SteamOS virtual keyboard.
- Home/Library/Appearance use the same search entry point, and the new
  search route uses Game Library's own status bar, without native overlap.

No native Steam/Decky CSS changes, no Appearance color editor, no
backend changes, no new network calls. CI includes new pure-engine
tests plus the full previous navigation/theme/Python/TypeScript/ZIP
regression suite. Device validation on MSI Claw required.
