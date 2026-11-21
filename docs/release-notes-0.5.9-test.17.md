# Game Library v0.5.9-test.17 — non-Steam local size resolution fix

- Resolve Steam userdata from the actual operating-system user's home,
  not merely the Decky backend's HOME. Check normal Steam, Steam root,
  and Flatpak Steam userdata paths; deduplicate aliases.
- Match unique non-Steam shortcut AppIDs even if the display title changed.
- Use Flatpak info --show-size with a partial app ref, omitting the
  incompatible --app option. Look up per-user Flatpak metadata in
  the shortcut owner's HOME, dropping root privileges when needed.
- Resolve home-relative AppImage paths against the shortcut owner's home.
- Include meaningful lookup failure reasons in tooltips and frontend logs.
- Preserve existing Steam size behavior, Library appearance, HLTB, and all
  navigation. No launcher execution or arbitrary directory scanning.

The initial direct Flatpak/AppImage scope is unchanged. Other wrapped
non-Steam titles still require their own install-location resolver.
Test actual Flatpak and AppImage shortcuts in Library > Installed;
the device's Steam user and shortcut format must be verified on hardware.
