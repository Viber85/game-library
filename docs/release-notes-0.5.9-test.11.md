Game Library v0.5.9-test.11 — Library alphabet scroll indicator (Phase 1)

NEW (dedicated full Library grid only):
- While sorted Alphabetical A–Z or Z–A, the right edge displays a thin
  passive alphabet index (# A-Z, or reversed for Z-A).
- The highlighted letter follows the focused game with D-pad/left analog,
  including Decky's gamepad focus signal, and follows the first visible row
  when scrolling by wheel/touch.
- Crossing into a different letter displays a large cyan-on-dark floating
  letter overlay for 850 ms. No overlay on initial load.
- Numbers/punctuation are grouped under #; Croatian/Latin diacritics
  are folded to the corresponding base letter.
- No fast-jump controls in Phase 1: LB/RB still switch tabs, Y still
  opens sort, A and Start keep their existing actions. Nothing new
  can take controller focus.
- No HLTB or internet requests, new polling, or persistent state.
  Only the tiny indicator updates during scrolling.

OUT OF SCOPE / UNCHANGED:
- Home carousel and its View More mode, Search, Collections, Appearance,
  Midnight theme, native Steam/Decky Settings, game metadata, covers,
  existing controller grid navigation and pagination.
- Other sort modes, including Installed's default Recently Played,
  show no alphabet index until the user manually chooses A–Z or Z–A.

Regression tests verify focus/scroll listeners and cleanup, sorting gate,
Latin letter normalization, and unchanged existing gamepad logic.
On-device check: Library > All Games > A–Z, scroll through changing
initial letters using D-pad and touch. Then switch to Recently Played;
both indicators must disappear. Verify LB/RB and B still work.
