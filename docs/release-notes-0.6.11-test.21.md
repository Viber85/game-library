# Game Library v0.6.11-test.21 — Safe Game Mode Home startup

## Problem

SteamOS sometimes mounts Valve's original `/library/home` before Decky finishes loading Game Library. Our previous `routerHook.addPatch("/library/home")` does not retroactively remount the already-active native route. Consequently, the `Use as Steam Home` option could be enabled while the first screen after a reboot or Desktop→Game Mode return was still Steam's original Home.

## Change

- Keep the current `/library/home` patch and existing Game Library dashboard, sidebar, Steam and GOG/Epic integrations **unchanged**.
- After the plugin registers all its routes, successfully reads `default_home`, and registers the Home patch, perform **one delayed navigation to our own registered Dashboard route**, only if the native Steam Home is still the current page.
- Supports Steam's canonical `/library/home` and `/routes/library/home`. For an opaque `/` or `/routes/index.html` client URL, requires visible native Home evidence; does not guess that an arbitrary CEF route is Home.
- **Never** navigate during a running game, Steam Settings, original Game Details, a custom Game Library route, the Steam Store, an open QAM/Main Menu, or after user gamepad/keyboard/pointer input.
- **Never** force a redirect on late plugin hot-reloads: the CEF document must still be within its initial 3-minute startup window.
- No permanent key/gamepad listeners, route mutation, global navigation hook or polling. The single 550 ms startup check and temporary input listeners stop immediately after firing, after user interaction, or when the plugin unloads.
- The existing `Use as Steam Home` toggle still enables/disables the feature. Disable it to keep native Steam Home. Other routes and Steam's B button remain intact.

## Device validation

1. Install `game-library-v0.6.11-test.21.zip` in Decky. Make sure **Use as Steam Home** is ON.
2. Restart Steam Game Mode; the native Home may render briefly before Decky loads, but the Game Library dashboard should become the initial page if you do not navigate away.
3. Repeat with **Switch to Desktop** → **Return to Gaming Mode**. Test a running game, original Game Details and native Steam Settings: none should be interrupted by a late redirect.
4. Turn **Use as Steam Home** OFF, reboot Game Mode and verify that Valve's original Home is left unchanged.
5. In case your Steam build reports an opaque route and the one-shot check cannot verify visible Home, the code **fails safely without redirecting**. The existing Home patch and **Open Game Library** action remain available.

## Limits

This cannot make Game Library appear before Steam or before Decky itself starts, and cannot guarantee startup redirection on Steam clients where route/home evidence isn't exposed. Automatic first navigation should be confirmed on the MSI Claw in actual SteamOS Game Mode. No new experimental native Game Details styling was restored.
