Game Library v0.5.9-test.2 — non-Home native status bar overlap hotfix

Fix the second (native Steam) status bar overlapping Game Library's own
title and SystemStatusBar on Library and Appearance, as reported on MSI
Claw A8 screenshots. The independent Dashboard route is covered too.

On the /game-library/* routes, Game Library now marks its fullscreen root
and hides only Steam's actual native #header via a tightly scoped CSS
selector. Home (/library/home) remains unchanged. The selector stops
matching as soon as Game Library is unmounted, restoring Steam's original
header automatically, including native Settings and other Steam pages.
The native header's geometry is retained to avoid Steam page layout jumps.

No DOM MutationObserver, broad hash-class selectors, native stylesheet
edits, controller focus/navigation changes, Appearance edits, color
editor, or library/game metadata changes.

Automatic Node/Python regressions, native theme tests, TypeScript and ZIP
packaging must pass. Validate on MSI Claw before treating this fix as
confirmed. Stable v0.5.8 remains available for rollback.
