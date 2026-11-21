# Game Library v0.6.2 — Advanced Smart Tabs

Smart Tabs now support independent combinations of native Game Library
conditions, automatic filtering and optional manual exceptions.

## What changed
- New dedicated **Edit Smart Rules** page inside left rail > Tab Manager.
- Choose conditions using explicit D-pad/touch-friendly choices (no
  previous one-condition-only limitation). Supported rules:
  Installed, Not installed, Steam games, Non-Steam games, Favorites,
  Not favorited and Played before.
- Combine rules using **ALL / AND** or **ANY / OR**. The editor previews the
  actual number of matching games in the current Game Library inventory
  before saving. No network calls are initiated for this preview.
- **Always Include** and **Always Exclude** use the existing manual
  game picker. Explicit exclusions override inclusions and Smart
  rules; selecting a game in one list automatically removes it
  from the opposite list.
- Rules, join mode and exceptions are saved per Steam account using
  the plugin's own existing atomic settings storage.
- Older v0.6.0/v0.6.1 single-filter Smart tabs are migrated to
  an equivalent one-condition rule without losing their contents.
- Manual Tabs, their saved IDs, tab sorting/order, navigation,
  installed sizes, HLTB and Home/Appearance remain intact.

## Scope and limitations
- Smart filtering currently uses only local verified Steam Game Mode
  information. **Played before** is a positive match for known non-zero
  last-played or playtime history; unknown history does not count as played.
- Epic/GOG store ownership/source filters need our independent future
  connectors. This release does not add web storefront access or remote
  uninstalled game Install Size.
- Manual exceptions select only games already visible in Steam's local
  library, including registered non-Steam shortcuts.
- A Smart tab with no rules includes all visible games except games in
  Always Exclude. Duplicate conditions are prevented.

## Test on device
1. Install 0.6.2 and verify old Manual Tabs still show their games.
2. Left rail > Tab Manager > create a Smart Tab named "Installed Steam".
3. Edit Smart Rules: set ALL (AND), add Installed and Steam games, Save.
   Verify the tab shows only installed Steam titles.
4. Switch the same tab to ANY (OR), Save; verify the result grows to
   Steam games plus all installed games.
5. Select Always Exclude and add one listed game. Verify it disappears
   from the Smart tab but remains in All Games.
6. Select Always Include and add a non-matching game. Verify it appears
   without modifying the Smart rules.
7. Reload Game Mode and confirm both conditions and exceptions persist.
8. Confirm Tab Manager and Settings remain in the left navigation,
   Manual Tabs still work, and L1/R1 respects tab order.

Automated Node, Python, TypeScript and Decky packaging checks run in CI.
Controller/dpad and touch behavior still need confirmation on hardware.
