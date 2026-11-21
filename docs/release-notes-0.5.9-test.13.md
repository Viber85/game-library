Game Library v0.5.9-test.13 — touch alphabet navigation

NEW (dedicated Library full grid, A–Z or Z–A only):
- Tap one letter on the right-side alphabet rail to jump directly to the
  first game under that letter.
- Drag a finger up/down over the rail to preview different letters;
  releasing the finger commits the highlighted letter and focuses the
  corresponding first game.
- The large floating letter preview remains visible during dragging
  and the right-side rail highlights the currently selected letter.
- The touch hit area is wider (42px, 40px on short screens).
- Dims missing letters and snaps touch selection to the nearest letter
  with available games, following the current sort order.
- Uses Pointer Events + pointer capture for touch, stylus and mouse.
  A canceled gesture, or a release far outside the rail, does not jump.
- Guards against a duplicate game jump from a synthetic click after touch.
- Uses existing progressive grid mounting to jump beyond 60 visible games.

UNCHANGED:
- Controller access from last grid card via D-pad right, up/down letter
  selection, A confirmation, B/left return, LB/RB tab switching, Y sort.
- Library cards, Home, Search, Collections, Appearance, Midnight native
  theme, Decky Settings/QAM, metadata/HLTB and caching.
- No network requests or additional backend operations for touch.

ON-DEVICE TEST:
1. Library > All Games > A–Z. Tap a letter such as H; the grid should
   jump to the first game beginning with H, even when not yet mounted.
2. Drag up/down along the rail, observing the cyan highlighted letter
   and floating preview; release over M to jump there.
3. Lift outside the right rail; check that far-off-rail gestures cancel.
4. Verify A/B, left/right, L1/R1 and Y remain functional with the D-pad.
5. Repeat in Z–A. On non-alphabet sorts, the rail stays hidden.
