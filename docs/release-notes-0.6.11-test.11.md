# Game Library v0.6.11-test.11 — Compact native Steam Game Details (experimental)

## Goal
First test of the user's preferred **Concept 1**: make Valve's native Steam game-details screen look closer to Game Library's clean GOG details page, while preserving every working Steam feature.

## How to enable
1. Install \`game-library-v0.6.11-test.11.zip\` via Decky Loader.
2. Open **Game Library → Appearance → Theme → Compact Game Details · Test** and enable it.
3. Keep the **Midnight** system theme enabled. Alternatively, toggle Compact Game Details through **Decky → Game Library**.
4. Open any **real Steam game** from the library. Native game details should become more compact.
5. To restore the previous native layout, **disable Compact Game Details · Test**. It is **OFF by default** and does not alter installed Steam files.

## What's new
- Shorter, cinematic native Steam hero with a dark gradient; retains the game's own hero/logo/video and title.
- When the current Steam route contains a valid numeric AppID **and Steam's own CDN cover loads**, a small portrait appears on the left of the hero. If the cover is missing, the game page stays functional and uses its original header. No third-party image service is required.
- Reduced Play/Install panel height and gaps, tighter HLTB data (only when HLTB for Deck is installed), smaller settings/controller buttons, and more compact native Activity/Your Stuff/Community/Game Info sections.
- Native Steam **Play, Install, Stop, Downloads/progress, Space Required, Cloud, controller configuration, Settings, achievements, notes, media, Community and other Steam actions all remain Steam's own interactive React components**; the plugin doesn't recreate them or bind their input events.
- Uses the existing Game Library Midnight runtime and Steam CSS module alias compiler. Every rule requires a route-scoped opt-in marker. Steam's Quick Access, Home, Settings and overlays are not restyled by this feature.
- The in-tab route watcher reads only a numeric AppID from the current Steam UI route and applies/removes styling variables. It is idempotent, uses a low-frequency 1800 ms check, and is shut down when disabled, when Midnight is switched off, or when Game Library unloads.

## Limits of this first test
- **Real SteamOS inspection is needed.** Steam CSS/DOM can differ by Steam beta/stable channel and device; the portrait and exact hero sizing are dependent on Steam's page layout and the live CSS module aliases.
- The concept image is a design reference, **not a guarantee of pixel-identical rendering**. Steam's own nested layout constraints may require additional targeted rules based on device screenshots.
- Steam's underlying tab content remains below the action row; nothing is removed to make it shorter.
- This test does not alter GOG's independent details or add GOG installation; those are separate work.

## Test checklist
On the actual handheld:
- Turn Compact Game Details **ON**, open a Steam game you own but haven't installed: verify **Install**, Space Required, controller layout, settings and tab navigation.
- Open an installed Steam game: verify **Play**, cloud status, and library return.
- Press D-pad and left analog in every direction; verify focus and B navigation.
- Inspect Activity, Your Stuff, Community, Game Info, achievements, notes and media for clipping.
- Turn **OFF**. Confirm the original Steam page returns without a restart. If the page appears different, navigate back and reopen it once.
- Send screenshots of the same Steam game in **ON** and **OFF** states for precise layout tuning.

## Safety / tests
- Off by default; persisted boolean setting; explicit disable/revert.
- No overwritten Steam assets, layout hacks in shared QAM or third-party plugin runtime.
- Automated tests cover settings persistence, CSS asset delivery, Steam route and real-image checks, idempotency, cleanup and legacy Midnight regressions.
