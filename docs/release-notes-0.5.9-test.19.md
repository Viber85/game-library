# Game Library v0.5.9-test.19 — compact size + HowLongToBeat cards

Dedicated Library covers now have a single two-metric footer:
- Disk icon and size only, no SIZE/EST text. A tilde still distinguishes
  the existing Steam Store required-storage estimate from actual local size.
- Clock icon and HowLongToBeat Main + Extras hours, not personal playtime.
- Unavailable values are displayed as a dash.
- Existing HLTB disk-cache hydration supplies cached values across cards.
  Missing values use the same HLTB request/cache path as sorting after a
  short focus delay; no new bulk remote lookup or duplicate cache.
- Card-specific subscriptions update the relevant values without re-sorting
  the whole library on every response.
- Existing bottom gradient, title, dimensions, focus, A-Z navigation,
  Steam, Flatpak, AppImage and Windows/Proton size sources remain unchanged.

Test on device: check the compact footer on Steam and non-Steam game
covers, compare the hours with the existing Main + Extras detail metric,
and verify scrolling/focus and HLTB sorting remain responsive. Utility apps
without a matching game result keep a dash.
