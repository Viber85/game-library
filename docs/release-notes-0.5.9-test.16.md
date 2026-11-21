Game Library v0.5.9-test.16 — installed non-Steam Flatpak & AppImage sizes

NEW:
- Library SIZE is now available on installed non-Steam shortcuts when the
  source can be identified reliably (Flatpak or a directly launched AppImage).
- Match the current Steam user's local binary shortcuts.vdf by BOTH the
  assigned shortcut AppID and title. Do not infer a Steam Store AppID from
  a non-Steam title; never execute shortcuts or shell scripts.
- For Flatpak shortcuts such as 'flatpak run org.example.App', query
  'flatpak info --show-size' (user installation first, system second).
  Displays SIZE for the installed application only, excluding shared
  runtimes and user data.
- For direct AppImage shortcuts, inspect the .AppImage file with stat().
  Displays its file size only, not additional app data or extracted files.
- Size values smaller than 100 MB are displayed in MB instead of
  misleading 0.0 GB. Other byte sizes display compact decimal GB.
- A non-Steam shortcut that cannot be mapped safely (custom shell script,
  arbitrary EXE wrapper, Lutris/Heroic title lacking a direct Flatpak or
  AppImage executable) displays SIZE —, never an invented Store estimate.

PERFORMANCE AND SAFETY:
- Only the selected/focused Library card is queried, after 400 ms.
- Cache local results 15 minutes, misses 2 minutes. Never scan full disks,
  aggregate Flatpak runtimes, recurse arbitrary directories, install apps,
  or touch unrelated processes.
- Read Steam shortcuts file without modifying Steam or installed apps.
- Only one exact currently active Steam account may be inspected; when
  Steam does not report the account, allow a single unambiguous local file.
- Flatpak CLI uses subprocess without a shell and with a short timeout.
- Steam-native installed sizes and Steam Store uninstalled estimates remain
  unchanged. Existing focus, A-Z rail, tab controls, and other screens
  remain unchanged.

HOW TO TEST ON MSI CLAW:
1. Library > Installed: focus a Steam shortcut to a Flatpak app (for example,
   Chiaki) for about half a second. Its SIZE should populate if the app is
   installed and the shortcut launches 'flatpak run <AppID>'.
2. Focus an AppImage shortcut whose Exe is the actual .AppImage file.
   SIZE should show its file size, in MB for smaller images.
3. Check a Steam game: its existing size behavior must still work.
4. Check a shell-script/unknown executable shortcut: SIZE — is acceptable
   rather than guessing the entire game's install directory.
5. Verify controller navigation, Fast Jump A-Z by D-pad, and touch dragging.

NOTE: Some external launcher shortcuts point to a wrapper (e.g. bash,
Heroic/Lutris executable or Flatpak plugin launcher). Those are intentionally
not guessed in this initial implementation. The exact shortcut command
would be needed to support additional patterns safely.
