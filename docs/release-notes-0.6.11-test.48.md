# Game Library v0.6.11-test.48 — simplified Steam and GOG Game Details

## Visual update
- Larger portrait cover and taller hero artwork, with a responsive shared Game Details layout.
- Steam and GOG show six metadata tiles in a 2-row × 3-column grid: HLTB main story, HLTB extras, HLTB completionist, personal playtime, Last Played and Achievements.
- Last Played is sourced from real selected-game metadata, not fabricated; unavailable GOG history displays a dash.
- Steam Achievements reuse the existing native selected-title provider and show unlocked / total, percentage and a slim progress bar. GOG displays an unavailable state until authenticated GOG achievement synchronization exists; no Steam IDs or achievement counters are guessed.
- Entire lower Activity / Your Stuff / Community / Game Info tabs and “View in Steam” entry are removed.
- Full-width action row now sits under the larger cover and metadata. On Steam, required space stays by Install, and HLTB, Store/Details, Controller and Options retain their existing handlers.
- GOG Install remains an explicit disabled placeholder until the independent gogdl integration is implemented. The native game-card artwork-to-hero fallback remains intact.

## Preservation
- Steam's native Install wizard, authenticated download state, Pause, Resume, Cancel and uninstall confirmation, safe cleanup, native controller focus and B return behavior are unchanged.
- GOG retains native Back focus and sidebar handoff. Without tabs and before installation handlers exist, Back is the only selectable Game Details control.
- Smaller displays use narrower cover widths and switch to a two-column metadata grid only when the viewport is under 650 CSS pixels.

## On-device checks
1. Compare selected Steam and GOG game details on MSI Claw with the target mockup: hero, cover, 2×3 tiles and actions.
2. Confirm Steam last-played value and real achievements percent; absent achievements show an unavailable state rather than 0%.
3. Verify Steam Install opens the original location picker, and ongoing downloads retain progress/Pause/Resume/Cancel and native uninstall confirmation.
4. Verify D-pad and left stick focus, Back and left-rail return, native HLTB/Store route returns, Controller and Options.
5. Verify native/SteamGridDB GOG heroes, portrait fallback, and explicit GOG no-installer/no-achievement states.
6. Check 1280×800 and narrower screen layouts for clipping and scroll overflow.

Source-level tests should pass in GitHub CI; actual Steam Game Mode behavior requires the handheld test.
