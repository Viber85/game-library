# Game Library v0.6.11-test.3 — Fix invisible GOG login in Game Mode

Fixes the user-reported issue where "Connect GOG automatically" indicated an open window but Game Mode showed no login page.

## Changes
- **Uses the visible Steam-owned browser**: clicking Connect GOG opens the native Game Mode external browser, already shown to work for the manual sign-in link.
- **Automatic callback detection**: while the Steam browser navigates, Game Library observes only the browser named "ExternalWeb" from SteamUI's main-window HeaderStore. It captures only the exact HTTPS GOG \`embed.gog.com/on_login_success?origin=client&code=...\` callback.
- **Survives route changes**: monitoring runs at plugin scope even while the Settings page is unmounted to show Steam's browser. After success, the backend exchanges the one-use code and the user returns to the GOG Integration settings page.
- **No invented popup**: removes the nonfunctional \`BrowserView.CreatePopup()\` and \`window.open()\` mechanism. No Steam browser view is created, destroyed, hidden or modified by our plugin.
- **Safe limits**: hard-coded domain checks, first observe the official GOG sign-in URL, timeout, cancellation and listener cleanup. No reading cookies or web page contents.
- Keeps a manual fallback for Desktop Mode browsers that allow copying a URL. The Steam Game Mode browser is not required to support copying anything.
- Installation and launching GOG games are still reserved for later phases.

## How to test
1. Install ZIP v0.6.11-test.3.
2. Game Library → Settings → GOG Integration → Connect GOG automatically.
3. The full Steam Game Mode browser should open and display the GOG login.
4. Finish sign-in. The plugin should capture GOG's callback, exchange the code and return to the connected GOG Integration page.
5. Library → GOG should list owned games after synchronization.

## Validation
CI tests cover callback validation, owning Steam browser detection, no external tab interception, one-time code exchange, timeout, cancellation and no cross-plugin access. Actual SteamOS callback handling still needs a device test, because CI cannot run the real Game Mode UI.
