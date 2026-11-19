Game Library v0.5.8-test.3 (test release)

Performance-only: batch native Steam/Unifideck collection lookups within
a single tab resolution pass, coalesce simultaneous HLTB/ProtonDB metadata
requests across selected-game cards and sorting, and index HLTB cached
chunks once instead of rescanning each block. All results are refreshed
on the next applicable cycle; no persistent frontend cache added.

No CSS, Appearance, controller mapping, focus, Game Details B, native
Steam Input, sorting modes, image behavior or layout changes.
CI regressions and packaging must pass. On-device MSI Claw test recommended.
