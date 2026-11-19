# Game Library v0.5.8-test.4 — Midnight CSS runtime optimization

The v0.5.8-test.3 Game Mode layout, native Steam/Decky styles, controller
routing, focused Settings/Menu rows and Game Details B return are unchanged.

The CSS alias compiler previously called findClassModule for every known
Steam CSS module once for each detected DevTools tab in each 6.5s sync. This
scans the same Decky webpack registry unnecessarily for Home, QAM and
MainMenu. Now one CSS-module snapshot is shared throughout one sync and each
of the two CSS scopes is compiled once at most.

Cross-sync CSS compiled strings are reused only while every class mapping
referenced by the exact CSS content is unchanged. A lazy-loaded class module,
a changed Steam class hash or a changed raw stylesheet invalidates the entry.
The live 6.5s rescan, DevTools DOM verification, atomic injection-before-
removal and native Settings audit watchers are all retained.

The runtime also refrains from notifying Decky theme-status subscribers
for exactly unchanged status snapshots. Full regression tests run for both
alias-cache invalidation and native focus CSS.

No appearance editor or user-facing changes. Device testing required.
