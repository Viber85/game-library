# Game Library v0.6.11-test.17 — Minimal native Steam game details

## Why

Real MSI Claw SteamOS screenshots of test.16 showed the native hero and PlaySection were both found and styled (218 px and 73 px; five of six CSS aliases), but the **visible game details still resembled Valve's default page**. Specifically, the HLTB strip and Install/statistics region retained prominent blue backgrounds, navigation looked unchanged, and the portrait cover was absent.

## Changes

- **Dark cinematic hero:** more balanced banner height, restrained left-side gradient, native logo spacing and decorative portrait placement when an authenticated-by-hero AppID/asset exists. Remove the temporary COMPACT TEST/NATIVE proof-of-concept labels, keeping the actual on-device CSS checks.
- **HLTB row:** transparent wrapper with near-black compact statistics surface, muted captions and a low-contrast Details button. Retains the original HLTB plugin's four real values and navigation; no artificial numbers.
- **Install/Play:** preserve Steam's native button, required storage, last played, playtime, controller and settings actions while darkening the PlaySection and its **broad structural child backgrounds**. The bounded DOM marker refuses to style buttons, focus nodes, and progress controls. Fully removes marks on opt-out.
- **Quiet content:** minimal tab pills, subtle focus, dark Activity/comments/news surfaces and less heavy outlines.
- **Portrait fallback:** if the game's observed Steam hero asset URL contains a validated 40-character content-hash directory, try hashed Steam portrait paths before the traditional AppID-only path. Safe Steam CDN only; never infer another game's AppID from global artwork. Does not claim all games have a usable portrait.
- **Diagnostics:** add verified HLTB styling and count of native PlaySection inner visual surfaces. Midnight CSS revision 87 forces replacement of the old style sheet. Native observer revision 17 cleans previous observers during hot updates.
- **Regression tests:** cover bounded visual child marking, Steam controls left untouched, cleanup, HLTB CSS, hashed asset portrait and safe fallback.

## How to validate on SteamOS

1. Install `game-library-v0.6.11-test.17.zip` through Decky Loader and verify the version.
2. Enable **Midnight** and **Compact Game Details · Test**.
3. Open a *native Steam-owned game's* Details page. The row with HLTB times and the native Install/statistics area should look noticeably darker and less saturated. The game art and native Install/Play, controller and settings actions must remain usable.
4. Send one full-screen screenshot. For any blue area that remains, open **Read CEF diagnostics** and report **HLTB row**, **Verified native Play panel surfaces**, native PlaySection status and aliases. This distinguishes stylesheet targeting problems from a style being covered by another Steam wrapper.
5. Verify D-pad/analog focus, Install/Play/Stop, download progress, Activity, Your Stuff, Community and Game Info. Turning off Compact should fully restore the original Steam page.

## Limits

This is a cautious visual refinement of Steam's **real** React UI, not a replacement of the native page or a fully restructured GOG-style screen. Real-device appearance and poster availability remain to be confirmed. Existing Steam controls are never removed or moved and the GOG integration is unchanged.
