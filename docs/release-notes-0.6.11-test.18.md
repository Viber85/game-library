# Game Library v0.6.11-test.18 — Native details paint targeting

## Evidence
On the user's MSI Claw SteamOS, v0.6.11-test.17 still left HLTB, Play/Install and Activity as wide blue bars, despite the earlier diagnostics showing hero and PlaySection CSS active. That is a selector/paint-surface problem, not evidence that a full Steam Details redesign is working.

## Changes
- **Paint-targeted instead of selector-only**: on the VERIFIED native Steam Details page, sample a bounded grid of actual visible Steam CEF elements below the hero via `document.elementsFromPoint`, then inspect computed background color/gradient. Mark only broad blue-painted structural DIV/SECTION/ARTICLE/MAIN elements inside the native game UI.
- **Safeguards:** never tag Play/Install buttons, native controller/menu buttons, progress controls, focus targets, thumbnails, artwork, Steam's hero, Game Library UI, unrelated app pages, or QAM. Requires a visible verified native hero and plausible geometry. All marks are removed on Compact opt-out.
- **Dark minimalist paint:** a compact opt-in CSS rule turns those confirmed broad blue panels into a neutral deep navy, without altering Steam's native control handlers or DOM order.
- **Actual verification:** Quick Check reports `Visible blue panels found` and `Panels confirmed dark by actual computed paint`. The latter checks **opaque computed background RGB** and that no gradient is still visible; a CSS variable alone no longer counts as success.
- **No 1.8-second flicker:** preserve existing marked nodes across subsequent checks rather than removing/reapplying them every scan.
- **No cosmetic guessing:** the existing PlaySection, hero, HLTB, Activity and portrait artwork refinements remain. The thumbnail still requires an ID/usable asset discovered from the game's actual hero; it is not fabricated or hard-coded.
- CSS revision 88 forces a fresh style sheet.
- New simulation tests verify visible blue paint detection, real darkening, no repeated unmark/re-mark, controller button/image protection and cleanup.

## Test on the device
1. Install `game-library-v0.6.11-test.18.zip`, enable Midnight + Compact Game Details.
2. Open a native **Steam-owned** game's original Details page, not the Game Library/GOG custom page.
3. Compare the HLTB and Play/Install/Activity blues with test.17. Use normal D-pad/controller actions to ensure Install and Settings remain working.
4. If still visually blue, from that exact page use **Read CEF diagnostics** and report the two *computed paint* counts, plus HLTB row and PlaySection. Counts of 0/0 imply the painted wrappers aren't sampled, while found > 0 with dark < found means the CSS rule is not winning the cascade.

## Honest limits
This tests an observed-paint repair, not a fully reordered custom Steam Details React layout. Real device appearance is unverified until the screenshot and native computed-paint counters agree. No native game actions, Steam files or non-Steam integration have been changed.
