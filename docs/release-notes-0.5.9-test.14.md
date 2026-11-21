Game Library v0.5.9-test.14 — Steam size metadata verification build

NEW — dedicated Library grid (not Home/Search/Collections):
- Displays a compact SIZE row at the bottom of Steam game covers.
- Installed games use Steam CAppOverview.size_on_disk when present: true
  local disk usage in decimal GB. A missing native value is not guessed.
- If the native size is missing, an on-focus query retrieves the Steam
  Store's PC "Storage" requirement. The cover displays EST. ~70 GB (sample).
  A tooltip explicitly says estimated Windows/Proton minimum or recommended
  requirement, not actual installed bytes or download size.
- For Linux-only Store entries, use the Linux requirement with explicit
  platform attribution. Never substitute RAM/VRAM or unlabelled numbers.
- Unknown, unsupported or unlisted games display a dash instead of 0 GB.
- Non-Steam shortcuts do not use unrelated Steam AppIDs or title guesses.

PERFORMANCE & SAFETY:
- No full-library remote prefetch. Query only the selected card after 850 ms
  of stable controller focus. Switching focus cancels scheduled lookup.
- Single bounded backend request, 3-second provider cooldown (deferred
  rather than queueing), persistent positive/negative TTL disk cache.
- HTTP 429/403 applies extended cooldown; no repeated request storms.
- Steam Store endpoint is fixed HTTPS public metadata, no cookies, login,
  depots or download/install actions.
- New Decky RPCs steam_install_size (single title) and
  steam_size_cached_bulk (cache-only, no network) for future iterations.
- Existing HLTB cards/cache, focus controls, alphabet index, layout dimensions
  and all other routes remain unchanged.

IMPORTANT: Steam Store *required free storage* is a rough estimate,
not Steam's true per-depot install size or download size. Some games have
missing/incorrect requirements and remain unknown. The Store size estimate
is deliberately not used for size sorting in v0.5.9-test.14.

TEST IN GAME MODE:
1. Library > All Games > A–Z. Installed Steam game should show SIZE XX GB
   if the Steam overview contains size_on_disk.
2. Focus an uninstalled Steam game for ~1 second. Check whether the lower
   label switches from SIZE — to EST. ~XX GB.
3. Compare the Steam Store System Requirements page for that title.
4. Scroll to another uninstalled game and revisit: cached estimate should
   display immediately. Check that switching tabs/letters is responsive.
5. Check a non-Steam shortcut: no false Steam size.
6. Verify D-pad right alphabet rail, touch/drag letter selection and
   A/B/LB/RB/Y controls still work.

NEXT PHASE (not in this release): decide whether to expand the badge
to HLTB Main + Extras on ALL Library covers and whether to add an
optional, user-initiated Store-size cache fill.
