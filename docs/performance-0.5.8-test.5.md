# Game Library v0.5.8-test.5 — conservative dashboard component extraction

v0.5.8-test.4 was user-confirmed on the MSI Claw. This update makes only
source layout and responsibility boundaries clearer; it does not introduce
new controls, artwork priorities or animations.

- Extract `HeroBackdrop` and `GameLogo` unchanged to
  `SelectedGameArtwork.tsx`, retaining the shared in-flight
  `RequestAppDetails` guard, native/custom artwork priority and
  SteamGridDB fallback.
- Move running-game poster and long-title marquee unchanged to
  `RunningGameVisuals.tsx`.
- Isolate the existing running-game React state and 1.6-second Steam
  status poll in `useRunningGameState.ts`; no-op identity equality,
  focus listener cleanup, stale running-game handling and sidebar
  behavior remain as before.
- Extract the passive metadata sorting notice to
  `SortProgressNotice.tsx`.
- Keep `GameCard`, gamepad D-pad transitions, Y sort, Start native
  context menu, A/B/bumper mappings and grid focus *inside Dashboard*.
  Avoid broad controller refactoring while the current version works.
- Remove imports rendered unused by extraction. Maintain tests on their
  new source ownership and add explicit extraction regressions.

No appearance editor, CSS/Steam Settings changes, layout changes,
backend changes, HLTB/ProtonDB behavior changes or Steam routes.

Run complete automated CI, typecheck, ZIP packaging and on-device
MSI Claw regression checks before promoting the test version.
