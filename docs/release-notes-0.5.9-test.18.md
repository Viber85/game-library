# Game Library v0.5.9-test.18 — direct Windows/Proton shortcut SIZE

- Supports direct non-Steam Windows .exe shortcuts on local storage and
  removable media. Uses the actual target and StartDir from shortcuts.vdf.
- Looks for a specific game directory. Recognizes conventional bin and
  Unreal Engine Binaries/Win64 paths where the root can be justified.
- Measures apparent game file sizes, excluding nested compatibility
  prefixes, shader caches, symlinks and other mounted filesystems.
- Rejects broad library/root directories and limits each scan to 6 seconds
  / 150,000 entries. Uncertain or incomplete scans display SIZE —.
- Reuses local focus-triggered lookup and cache, with no game launches.
- Existing Steam, Flatpak and AppImage providers are unchanged.

Test by focusing a locally installed Windows game added directly to Steam
with Proton compatibility enabled. If the directory is not identified,
report its Steam shortcut Target and Start In values so the resolver
can be improved without guessing. External launcher wrappers remain
outside the scope of this test release.
