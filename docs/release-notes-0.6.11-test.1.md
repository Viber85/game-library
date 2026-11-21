# Game Library v0.6.11-test.1 — Independent GOG library (phase 1)

This development release adds an independently written, read-only GOG account integration. It does not copy or depend on Unifideck code, configuration, tokens, or installed-game markers.

## Included
- **Plugin Settings → GOG Integration**: open GOG's login URL in a browser; paste the resulting login-success URL or one-use authorization code; connect and disconnect.
- OAuth token exchange and refresh through GOG endpoints. Session secrets remain in Game Library's own mode-0600 file, scoped to the currently signed-in Steam account. Credentials are never returned to the UI.
- Pagination through the authenticated GOG owned-products endpoint. Only after **every page** succeeds do we replace the local game-list cache. Network failures leave the last complete list available.
- **Library → GOG**: independent tab showing GOG-owned titles, optional cover images, search by title prefix, gamepad-friendly focus and detail selection.
- This first phase intentionally does **not** install, run, uninstall or import games into Steam. No generated Steam AppIDs, shared credentials, or shortcuts are created.

## First-time setup
1. Keep Unifideck enabled if you still rely on it for launching games. Do not remove your existing GOG installation.
2. Install this development ZIP through Decky.
3. Open Game Library → Settings → GOG Integration.
4. Open GOG Sign-in, complete GOG authentication, and copy the resulting URL containing **code=** (not your password). Paste it into the Game Library field and choose Connect.
5. Select Library → GOG. The games will be displayed from the first successful synchronization. Use Refresh for subsequent changes.

## Limitations
- GOG's Galaxy-style browser authorization flow is not a first-party public OAuth registration for this plugin. It may change or require a captcha; login currently requires the manual paste step.
- The connector uses publicly documented GOG HTTP endpoints and a public Galaxy client credential; it has no privileged access to GOG.
- GOG list entries are **owned library records**, not proof that a game is installed. Installed-state detection, downloads, Proton launching, and Steam shortcut management are planned for later phases.
- GOG is temporarily a fixed virtual Library tab; existing Steam Smart/Manual tabs and their saved configuration are unchanged.
- No device or live account authentication can be validated by CI. Test the login redirect and actual Game Mode controller navigation on the handheld before relying on it.

## Safety
- Never paste the GOG password into Game Library. Only the short-lived login-success authorization code is accepted.
- Log-out deletes the plugin's own local session and library cache for the active Steam account.
- Token storage is file-permission protected but not hardware-encrypted. Do not share or back up its private settings directory.
- This is a development build; the last stable version remains v0.6.10.
