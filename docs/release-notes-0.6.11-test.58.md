# Game Library v0.6.11-test.58 — GOG Set up Play Steam API compatibility

## MSI Claw report

The Game Mode launch modal for Beneath a Steel Sky displayed “Steam shortcut or Proton APIs are unavailable in this Game Mode,” which came from a combined guard requiring **AddShortcut**, **GetAvailableCompatTools**, and **SpecifyCompatTool** simultaneously. A missing per-app Proton-list method unnecessarily disabled shortcut creation even when the Steam shortcut and configuration APIs were available.

## Corrections

- Check Steam shortcut creation separately, with precise errors identifying the missing Steam API.
- Call `SteamClient.Apps.AddShortcut(title, executable, "", "")` first, as supported by other Game Mode Decky integrations; retry a quoted target only if the initial call fails. Some Steam clients return zero when given a start directory in this first call.
- Wait for the Steam app overview, then set shortcut name, quoted executable path, raw start directory and launch options via the individual Steam Apps setters.
- Use the per-app `GetAvailableCompatTools(appId)` API when available, otherwise fall back to `SteamClient.Settings.GetGlobalCompatTools()`; never invent Proton tool names.
- Register the Steam-assigned non-Steam AppID before attempting Proton configuration, so a subsequent setup retry does not create duplicate shortcuts.
- On unavailable Proton configuration, show a targeted explanation while leaving the shortcut in a **registered but not ready** state. No background edit to `shortcuts.vdf`, no restart and no fake launch success.

## Device checks

1. Open completed GOG game → Set up Play → select an executable → Configure with Proton.
2. Confirm the previous broad “shortcut or Proton APIs” error is replaced by a successfully configured game or a specific Steam API error.
3. Confirm the Steam library contains only one shortcut for that title, and repeat setup does not duplicate it.
4. Verify Steam Properties → Compatibility shows the selected Proton tool and the executable path is correct.
5. Test Play only after Game Library reports configuration ready. A shortcut sent to Steam does not guarantee actual game startup.
6. The classic **Beneath a Steel Sky (1994)** release may use ScummVM; the discovered `scummvm/scummvm.exe` is an interpreter and may require game-specific parameters. Do not assume that selecting it guarantees the game itself launches. We should separately verify the correct launcher after the shortcut bridge works.

Automated TypeScript/Node/Python checks are source-level; real Steam Game Mode APIs and actual launch behavior must still be confirmed on MSI Claw.
