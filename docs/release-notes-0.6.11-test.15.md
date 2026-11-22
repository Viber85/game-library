# Game Library v0.6.11-test.15 — Native Steam CEF selection fix

## Confirmed code defect

The native Compact Game Details theme could be injected into the wrong Steam CEF context. When a tab with a recognizable Steam UI was already found, Game Library stopped looking for other known Steam UI tabs. On some SteamOS builds, the real native Game Details context is a separate `SP`, `Steam` or `SharedJSContext` tab with an opaque/blank DevTools URL. That tab was ignored even when its DOM was valid.

This could leave Midnight loaded in one Steam context while the original Steam Details screen displayed unchanged.

## Fixes

- Check **every actually listed known Steam CEF main tab** rather than stopping at the first main tab. A tab with an unrecognized URL must pass the existing live Game Mode DOM check before receiving styles. Unknown websites are never injected.
- Preserve the existing narrow, proven Steam page check and avoid guessing hidden/absent CEF titles.
- The diagnostics Quick Check now inspects all verified main tabs and prefers the one showing native game elements, or a recent pre-QAM native-game snapshot, rather than always inspecting the first main tab.
- Add a regression test for two simultaneous Steam contexts: recognizable Big Picture plus native `SP` with an opaque URL. Include this test in CI.
- No changes to native Steam Play/Install actions, controller navigation, Steam files or GOG integration.

## Test on the actual device

1. Install the ZIP via Decky and confirm version **0.6.11-test.15**.
2. Enable **Midnight** and **Compact Game Details · Test**.
3. Open the original **Steam-owned game Details** screen, not Game Library's own dashboard or GOG details.
4. Look for `COMPACT · NATIVE` in the native game header. If it is absent, open Decky → Game Library → **Read CEF diagnostics (no reload)** from that screen.
5. The Quick Check should now prefer a CEF tab with native-game evidence; report the exact **CEF tab**, **Native Steam hero**, **Native Steam Play/Install**, and **CSS-module aliases resolved** values. Do not treat the global Midnight CSS marker as proof of visual success.

This repair addresses a real discovery bug, but **does not claim that native Steam classes were correctly recognized or that the intended redesign is visible until tested on-device**. If the CEF target is now correct but hero/playbar remain NOT FOUND, the next issue is Steam's live CSS-module mapping, not color/layout tuning.
