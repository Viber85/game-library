# Game Library v0.6.11-test.4 — Steam on-screen keyboard focus fix for GOG

## User-reported issue
- The official Steam Game Mode browser now opens GOG correctly.
- Entering an email address into GOG's login form with the Steam virtual keyboard interrupts the field after every character; GOG then reports an invalid email.

## Change
Steam's Game Mode browser has a focus cycle in its virtual-keyboard handler: native BrowserView \`SetFocus(false)\` immediately followed by \`SetFocus(true)\` after each key.

This build adds a **GOG-login-only keyboard focus guard**. It coalesces those two calls into one focus-preserving action so the GOG form does not get an unnecessary blur for every character.

- Actual focus loss still propagates on the next microtask.
- The original native Steam method is restored when the GOG authorization session ends, times out, is canceled, or the plugin is unloaded.
- If Steam prevents the guard from installing, Game Library does not override native behavior.
- No GOG page scripting, field reading, password collection, cookie access, or Unifideck code.
- Existing Steam Library behavior and other browser sessions remain unchanged.

## Validation
Offline regression tests cover:
- Full email input without per-character blur;
- Legitimate focus loss and restoration;
- Inherited Steam method restoration;
- Nonwritable Steam native bridge handling;
- Scope to the GOG login and cleanup.

**Real SteamOS test required:** this guard addresses the focus-toggle path in Steam's known Game Mode browser implementation, but no automated test can guarantee this is the only cause of GOG's input validation. Please test the GOG email entry in Game Mode and report whether the entire email stays in the field.

## Install
Install \`game-library-v0.6.11-test.4.zip\` in Decky Loader. Navigate to Game Library → Plugin Settings → GOG Integration → Connect GOG automatically. Try entering a complete email via the on-screen keyboard. No manual copying of the authorization code is required in the intended flow.
