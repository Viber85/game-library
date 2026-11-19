Game Library v0.5.9-test.1 — sidebar redesign (test release)

The left Game Library rail now follows our agreed layout: Running Game
(only during play), Home, Library, Appearance and Steam Menu.
Remove the duplicate Store, Downloads, Settings and Power shortcuts.
The Steam Menu action attempts to open the actual native Steam panel
rather than recreating it or synthesizing controller events.

Appearance is a dedicated Game Mode page with collapsible Theme,
SteamGridDB Artwork and Updates cards. Only existing Midnight/Steam
Default theme options are functional now; the future Color Editor is
deliberately not part of this build. Previous SteamGridDB settings
and update tools are preserved inside the Appearance page.

Decky QAM keeps Game Library and Midnight enable toggles, diagnostics
and an Open Game Library entry for users who disable Home replacement.

No changes to native Steam CSS, Midnight palette, game cards,
Home/Library layout or core gamepad navigation. Test Steam Menu action,
Appearance focus and all Settings focus transitions on MSI Claw before
treating this as stable. v0.5.8 remains available as rollback.
