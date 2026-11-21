# Game Library 0.6.1 — Manual Tabs and Left-Rail Management

## New
- Tab Manager is now a full Game Mode page opened from the permanent
  **Tab Manager** item in Game Library's left rail. The former Library
  top-row Tabs button is removed; native Sort remains in the top row.
- **Settings** is a separate permanent left-rail item with functional
  Steam Home override and Midnight theme switches. Appearance, updates
  and library diagnostics remain reachable there or through existing
  routes. QAM remains a fallback; the Home switch immediately updates
  the same runtime patch used by QAM.
- Create a custom tab in **Smart** or **Manual** mode, or switch an
  existing custom tab's mode in the editor. Existing Smart filters work
  exactly as in 0.6.0.
- Manual mode includes **Add / Remove Games**: search all games already
  present in Steam's local inventory (including non-Steam shortcuts),
  mark or unmark multiple items, inspect Selected only, and explicitly
  Save selection. Cancel discards unsaved changes.
- Manual membership stores exact numeric Steam app/shortcut IDs in the
  original Game Library per-account settings. Missing games remain
  remembered until restored or manually removed. Selections do not
  edit Steam, Steam collections, TabMaster or UnifiedDeck.
- The backend validates unique positive app IDs, 2,000 maximum per tab,
  allowed tab modes, per-account data and atomic write semantics.
- Existing tab ordering, hiding, renaming, deletion, L1/R1 navigation,
  Install Size, HLTB, A–Z rail, Home, artwork and Steam Game Details
  behavior are preserved.

## Scope
Manual Tabs select games **already in Steam's visible local library**.
This release does not implement Epic/GOG storefront login, remote owned
game discovery, or estimated sizes for uninstalled third-party games.
Those remain separate upcoming connectors.

## Device test checklist
1. Open left rail > **Tab Manager**; ensure the Tabs button is gone
   from Library's upper filter strip and Sort is still reachable.
2. Create a new custom tab, set Type: Manual, enter a name and Add tab.
3. Select the tab in Manager > **Add / Remove Games**.
4. Search for a title, select several games (Steam and non-Steam),
   switch to Selected only and unselect one; Save selection.
5. Confirm the new tab shows *only* selected games, including count,
   and L1/R1 cycles to it in the correct visible order.
6. Reload or reboot Game Mode; verify assignments persist.
7. Cancel after changing selections; verify the saved assignments do
   not change.
8. Use left rail > Settings; toggle Use as Steam Home and Midnight,
   verify changes match the existing Decky quick settings.
9. Leave TabMaster disabled to confirm the custom tab manager is native.
   Leave UnifiedDeck installed until separate Epic/GOG connectors exist.

## Built and tested
Automated Python backend tests and Node frontend/navigation/theme
checks run through GitHub Actions; real SteamOS controller/touch QA
still needs checking on the handheld.
