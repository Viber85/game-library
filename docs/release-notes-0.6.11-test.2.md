# Game Library v0.6.11-test.2 — GOG automatic sign-in experiment

This development update makes **Connect GOG automatically** the default action in Plugin Settings → GOG Integration.

## Changes
- Attempts to open GOG's official sign-in URL in a dedicated **native Steam BrowserView popup**.
- Listens only for GOG's HTTPS \`/on_login_success\` navigation event; takes the short-lived \`code\` from the redirect and immediately closes the popup.
- Game Library's existing Python backend exchanges the authorization code and synchronizes purchased GOG games. No password is passed to the plugin.
- Keeps **Manual sign-in (fallback)** available if this SteamOS build blocks popups, closes them early, or its browser URL events differ.
- Adds redirect-origin validation, cancellation, native-window cleanup, and a 10-minute timeout.
- No Unifideck code, data or API is used; installed Steam games are unaffected.

## Testing and limitations
- Offline tests cover exact GOG redirect validation, prevention of spoofed callback URLs, one-time delivery, and cleanup.
- Steam's \`BrowserView.CreatePopup\` is a native client interface, not a stable Decky UI contract. End-to-end automatic login and controller focus **must still be tested on the actual SteamOS handheld**.
- Do not assume automatic authentication works on every SteamOS version. The manual flow remains available in the same settings page.
- This phase is still read-only: downloads and launching GOG games are not yet implemented.
