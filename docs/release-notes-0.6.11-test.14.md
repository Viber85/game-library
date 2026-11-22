# Game Library v0.6.11-test.14 — Actual native Steam Details styling and verification

The on-device screenshot after v0.6.11-test.13 still looked very close to Valve's default game details. Previous diagnostics reporting `Compact layout matched: YES` only meant that a stylesheet selector matched the root, **not** that the hero or Play/Install panel was actually restyled.

## Changes

- **Actual Steam CSS-module lookup:** our existing Decky `findClassModule` compiler resolves current hashed Steam classes for the native header, PlayBar, title and section headers. Only sanitized, already-compiled class tokens are passed into the Steam CEF script.
- **Native element decoration:** the script now directly tags the real native hero, Play/Install bar and section headers with temporary `data-glm-native-compact-*` attributes. The opt-in CSS targets these tags and applies a visibly shorter cinematic header, compact native Play/Install bar, optional portrait if the Steam image loads, and compact section headers.
- **Clear visual indicator:** a temporary `COMPACT · NATIVE` label appears on the actual hero when the new direct styling is applied.
- **Truthful per-element diagnostics:** the QAM Quick Check distinguishes "root CSS matched" from "**Native Steam hero: FOUND / STYLE APPLIED**" and "**Native Steam Play/Install: FOUND / STYLE APPLIED**". It also reports the actual measured element heights and how many of four webpack CSS-module tokens were resolved. The most recently verified element styles are retained for a short time when QAM hides the page.
- **Safe fallback:** if Steam's CSS module is unknown on this build, the script attempts its readable class and reports clearly when no element was found. No alternate Steam UI is substituted.
- **Undo:** disabling Compact Game Details removes all temporary attributes, portrait variables, runtime observers and injected compact CSS; restores Valve's original page without touching Steam files.

## Test instructions
1. Install `game-library-v0.6.11-test.14.zip`. Keep Midnight and Compact Game Details enabled.
2. Open the **native Steam game details**, e.g. a Steam-owned game. Check whether the hero now shows `COMPACT · NATIVE` and the Play/Install area becomes more compact.
3. Open Decky → Game Library → **Read CEF diagnostics (no reload)**. At the top check **Native Steam hero** and **Native Steam Play/Install** for `FOUND · STYLE APPLIED` and their height in pixels.
4. Test D-pad and analog in four directions, Install/Play/Stop, download progress, controller and settings buttons, HLTB, and the Activity / Your Stuff / Community / Game Info tabs.
5. If either native element remains `NOT FOUND`, send a photo of the Quick Check. This identifies a missing Steam CSS-module token instead of triggering more arbitrary CSS changes.

## Scope
GOG integration and its independent details are unchanged. The native Steam layout still needs device validation against the chosen first visual concept; this is a focused test of actual element styling, not yet a complete pixel-perfect redesign.
