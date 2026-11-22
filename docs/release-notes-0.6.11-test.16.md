# Game Library v0.6.11-test.16 — Native Play/Install fallback and stable hero art

## Evidence from the handheld

The user's SteamOS Quick Check confirmed **Native Steam hero: FOUND · STYLE APPLIED · 217 px**, but **Native Steam Play/Install: NOT FOUND** and just **3/4 CSS module hints** resolved. The poster appeared only briefly. This means the native CEF targeting repair from test.15 worked, but the native action area remained unchanged.

## Fixes

- Resolve two additional native Steam CSS module anchors: `basicappdetailssectionstyler_PlaySection` and `appactionbutton_PlayButtonContainer`. The real PlayBar remains first priority. If it is missing, the script decorates the real PlaySection; if both are missing, it can decorate the actual Play button container. No recreated Play, Install, Stop, progress, focus, or settings buttons.
- Apply a minimal dark panel with subtle border and spacing to the native PlaySection, plus tighter native action sizing. Directly tagged Steam title, hero and section headings receive consistent styling.
- Native Quick Check distinguishes **PlayBar**, **PlaySection**, and **PlayButton** fallback, reporting the matched node's actual pixel height. CSS alias diagnostics now show a total of six candidates instead of four.
- Poster app IDs are derived **only from the actual native game's hero** (Steam route or image/computed background within its hero), not an arbitrary background image from the whole Steam UI.
- A hero video/load transition no longer deletes a verified poster on the first missing asset/DOM scan. When no stable ID exists, it does not flash an unrelated game poster.
- In-tab observer revision 16 stops an older test.14 timer during in-place upgrades. Midnight CSS revision 86 forces refreshed styling after update.
- Expand mocked tests to cover PlaySection fallback, Steam's static URL, poster stability, cleanup and all six CSS aliases.

## Device test

1. Install `game-library-v0.6.11-test.16.zip` from Decky. Enable Midnight and Compact Game Details.
2. Open the **original Steam game's** Details page. Observe whether Play/Install sits in the new dark compact panel, and whether a cover remains visible without flickering.
3. From that screen open Decky → Game Library → Read CEF diagnostics. Share **Native Steam Play/Install**, including the `(PlayBar)`, `(PlaySection)` or `(PlayButton)` source, its pixel height and the count of six CSS aliases.
4. Check all actions and navigation. Turn off Compact to restore Valve's layout.

This is a **targeted, device-unverified repair**. Build/test success does not establish that SteamOS exposes the PlaySection/PlayButton modules on this particular client. No GOG behavior is modified.
