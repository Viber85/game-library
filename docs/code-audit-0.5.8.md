# Code audit — Game Library v0.5.8-test.1

Scope: actual GitHub main source at v0.5.7, followed by a conservative,
testable cleanup. The goal is **less work on every Game Mode refresh with
identical visible behavior**, not a visual redesign.

## Implemented and verified

1. **Unnecessary per-15-second library rerenders.** Steam's
   `getLibraryGames()` returns newly allocated game arrays on every poll,
   even when the displayed metadata has not changed. The new
   `sameLibraryGames` utility compares all fifteen primitive
   `LibraryGame` properties that influence rendering and sorting.
   When identical, `setGames` returns the previous React state.
   Changes in art, game title, installed/favorite, last-played,
   achievement progress, release date, installed size and playtime still
   trigger updates.

2. **Collection membership guard.** A naive snapshot-only optimization
   would break real native Installed/Favorites counts and TabMaster /
   UnifiedDeck Epic/GOG collections: Steam can change collection
   membership without changing a game's overview object. The separate
   `libraryTabSignature` compares each tab's real member AppIDs and
   unsupported status. That comparison is evaluated on the normal
   15-second refresh, and a membership-only change invalidates both
   `tabCounts` and `tabResult`. This is **required**, not optional.

3. **Duplicate Steam details requests on game selection.**
   `HeroBackdrop` and `GameLogo` previously both called
   `appDetailsStore.RequestAppDetails(game.id)` on mount.
   The new `requestSelectedGameDetails` helper coalesces only the
   simultaneous requests and shares one Promise. Each component still
   receives its own successful completion and updates its own local
   image-fallback index. The request is not cached permanently, so
   selecting the same game later can pick up new artwork. Missing
   Steam API, bad game IDs and failures fail closed.

4. **No needless rerender from HLTB cache prewarm.** The v0.5.7 batch
   cache reader still warms local data regardless of the chosen sort.
   Previously, completing that read triggered a `metaRevision` increment
   even while sorting by A–Z, Recent or ProtonDB. Now it only
   triggers a library rerender when the active sort is HLTB.
   Switching to HLTB while the batch read is in flight remains
   supported by the existing metadata queue.

5. **Two dead helper exports removed.** The functions `posterUrl` and
   `heroUrl` in `steam.ts` had no consumers in the app sources.
   The actual working custom/SteamGridDB artwork pipeline uses
   `posterCandidates`, `heroCandidates`, `heroFallbackCandidates`
   and `logoCandidates`; these are preserved, unchanged.

## Deliberately not removed

- The large `themeProbe.ts`, `themeFocusTrace.ts`, and numerous
  `system-theme/*.css` overrides are **not** automatically considered
  dead code. They support current live native Steam/Decky diagnostics
  or specific hash/class-compatibility and focus fixes from MSI Claw
  device tests. Removing selectors by visual similarity risks
  unthemed pages, QAM clipping and regression of the cyan focused row.
- Dashboard route/UI navigation, Steam native context menu, return via B,
  TabMaster source listeners and current Steam Input exclusions were
  deliberately left unchanged.
- Polling itself is retained: Steam/UnifiedDeck does not reliably expose
  a common change event on all supported builds. Optimization avoids
  unnecessary **React updates** rather than guessing a nonexistent
  SteamOS observer.

## Verification and future work

The added Node tests directly exercise unchanged-vs-changed snapshots,
all relevant primitive fields, changing Epic collection membership
while overviews stay equal, simultaneous Steam details requests,
failure fallback, and the integration wiring. Existing native-theme,
SteamGridDB, TabMaster, HLTB and controller regressions still run in CI.

An opportunity for a separate later refactor is to split
`Dashboard.tsx` (about 44 KB), and gradually migrate the existing
`src/theme.ts` and `system-theme/shared.css` partial palettes into
semantic variables as documented in
[theme-color-roadmap.md](theme-color-roadmap.md).
That should be done incrementally with on-device testing rather than
removing CSS blocks or changing Steam's stylesheet injection pipeline
during a performance-only release.

**No new user-facing color controls and no palette changes in this release.**
