# Game Library v0.6.4 — Two-axis Tab Manager and Theme Hub

## Controller and keyboard navigation
- Tab Manager now explicitly handles D-pad/analogue **Up** and **Down**
  on every actionable control in the right editor panel, without
  removing the existing Left/Right controller navigation.
- Up/Down chooses the nearest control row using actual displayed
  geometry, then the nearest column, accommodating wrapped rows and
  different screen sizes.
- The new tab-name TextField supports Up/Down arrow-key focus transfer.
- Manual game selection, Smart rule editing, saved tabs and data models
  remain unchanged.

## Appearance
- The left sidebar's **Appearance** destination is now a dedicated
  **Theme Hub**. It retains the fully functional Midnight and Steam
  Default theme choices.
- A separate **Color Editor** panel is shown as **Planned**. It is not
  a working editor in this version.
- Artwork and update integrations are removed from Appearance, so it
  does not double as a general plugin settings screen.

## Plugin Settings
- General: **Use as Steam Home**.
- Library: **Tab Manager**, including existing Smart and Manual tabs.
- Integrations: **SteamGridDB Integration**, with the existing working
  settings, write-only personal API key, toggle and controls.
- Maintenance: **Updates**, including existing version display, release
  checks, installation, and manual fallback; and **Library diagnostics**.
- The old provider and update panels are relocated without changing
  their backend calls or Steam artwork precedence.

## Handheld test checklist
1. Open Settings > Tab Manager and select a custom tab.
2. In the right edit panel use D-pad Up/Down to move through button rows,
   the text field, and the Add Tab controls; confirm Left/Right still work.
3. Create / rename a Manual tab; open its Add / Remove Games picker;
   verify that its selected games remain after reboot.
4. Visit Appearance. It should show **Theme** and an inactive
   **Color Editor – Planned** panel, not SteamGridDB or Updates.
5. Change Midnight / Steam Default in Appearance and verify it applies.
6. Visit Settings > SteamGridDB Integration and verify current API key
   state and toggles. No existing secret should be exposed.
7. Visit Settings > Updates and verify version, Check for updates,
   and GitHub Releases controls.
8. Use Back to return to Settings from either provider panel.

Automated frontend, backend, TypeScript, and package tests passed.
Device-level Decky controller/touch verification is still required.
