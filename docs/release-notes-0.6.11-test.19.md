# Game Library v0.6.11-test.19 — Accurate pre-QAM native Details diagnostics

## Confirmed on-device issue in test.18

The user's MSI Claw screenshot showed native hero STYLE APPLIED (218 px), native PlaySection STYLE APPLIED (73 px), 1 internal Play surface, 2/2 blue panels claiming a dark computed color, but HLTB NOT FOUND, Compact stylesheet NOT CONFIRMED, and Game Library UI present in snapshot: YES.

The underlying diagnostic code mixed *old native Game Details hero/play measurements* with *current Game Library/QAM overlay stylesheet and HLTB measurements*. These were not all taken from the same game-only screen. The 2/2 report is not proof that the visibly blue Steam strips are gone.

## Changes

- Steam CEF background observer stores native Details measurements **only when the Game Library root is not visibly on screen**. Hidden React roots no longer count as visible Game Library screens just because their elements exist in DOM.
- The native snapshot cannot be overwritten when the Decky/Game Library panel opens. Background watcher revision **23** reinstalls the corrected observer instead of reusing the previous one.
- A single tested selection routine chooses the **live, unobscured Steam Details** evidence where available, otherwise a **recent pre-QAM** sample (up to 3 minutes old), otherwise **NOT VERIFIED**.
- Hero/PlaySection, CSS, the HLTB root, and dark panel counts all use the **same** selected measurement. The UI declares the source and age rather than mixing samples.
- CSS verification also recognizes computed markers on the actual native hero/PlaySection, since browser-managed injected style sheets do not always expose a literal `<style>` text node.
- Regression tests reproduce the precise case of live QAM missing HLTB while the earlier game snapshot has HLTB and native painted panels. Tests prevent advertising overlay-only 2/2 counters as native-game proof.
- Midnight CSS marker revision **89** refreshes runtime checks; there are **no new speculative visual CSS rules**. Existing Steam controls, game launches, HLTB data, gamepad focus and artwork are unchanged.

## Test instructions

1. Install `game-library-v0.6.11-test.19.zip`. Enable Midnight and Compact Game Details.
2. Open the original Steam-owned game's Details page, with the Game Library/Decky panel **closed**. Leave the game page visible briefly so the native observer can sample it.
3. Then open Decky → Game Library → **Read CEF diagnostics (no reload)**.
4. Read **Native game evidence**. It should show either `CAPTURED BEFORE DECKY` with a recent age or `LIVE ORIGINAL STEAM DETAILS`. If instead it says `NOT VERIFIED`, no reliable unobscured game snapshot was captured.
5. Read HLTB, native blue panels found and confirmed dark. Only same-snapshot evidence is comparable to the full-screen photo.

## What has NOT been proven

This is a diagnostic correctness release, not a completed native Steam Details redesign. The photo of v0.6.11-test.18 has not established that the large visible blue HLTB/Install/Activity bands were successfully restyled; a computed 2/2 count can refer to different DOM layers. The actual visible layout remains to be checked with the corrected diagnostics.
