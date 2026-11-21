# Game Library v0.6.0 — Original Tab Engine

Game Library 0.6.0 replaces the former TabMaster-driven tab presentation
with our own tab definitions, filters and manager. It does not import
TabMaster's source, definitions or configuration.

## New
- Five self-managed defaults: All Games, Installed, Steam, Non-Steam,
  Favorites. All Games and Installed cover both Steam and non-Steam
  entries already visible in Steam's own local library.
- A "Tabs" control after the tab strip opens the Game Mode Tab Manager.
- Add a custom tab, select one of six native filters (all, installed,
  not installed, Steam, non-Steam, favorites), rename, change its filter,
  hide/show, move up/down or delete a custom tab.
- Persist configurations per active Steam account in Game Library's
  own Decky settings JSON, with strict validation and atomic writing.
  Built-in tabs cannot be deleted or assigned invalid custom filters.
  At least one tab must remain visible.
- L1/R1 switches among visible tabs in the chosen order.
- Existing search, custom collections, native Steam details, controller
  focus, HLTB, ProtonDB and size badges are retained.

## Migration / limitations
- This is a new original configuration. Existing TabMaster tab settings
  are deliberately not imported.
- The TabMaster plugin can now be disabled for testing. Do not remove
  Unifideck until Game Library has its own Epic/GOG library connectors.
- In 0.6.0 Epic/GOG titles already registered as Steam shortcuts remain
  accessible under All Games and Non-Steam. The version does not yet
  fetch owned but uninstalled third-party store titles or expose native
  connected-account Epic/GOG tabs.
- Other previously authored TabMaster custom filters are not migrated;
  recreate supported filters using the new Tab Manager.
- If Steam is not signed in, defaults are shown but editing requires
  an active user to prevent account-unspecific writes.
- The tab manager is a first native release; focus/navigation and
  touch behavior require on-device verification on handheld hardware.

## Device checks
1. Install ZIP and open Game Library > Library > Tabs.
2. Add and rename a custom Not installed tab; verify correct counts.
3. Move it, hide Steam, confirm L1/R1 order, restore Steam visibility.
4. Reboot Game Mode and verify saved titles, filters and order.
5. Disable TabMaster and verify the built-in and custom tabs still work.
6. Keep Unifideck installed for its currently registered Epic/GOG shortcuts.
