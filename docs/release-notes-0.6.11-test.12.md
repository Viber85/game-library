# Game Library v0.6.11-test.12 — Compact Steam Details activation fix

This version fixes the principal reason the `v0.6.11-test.11` compact layout could look entirely unchanged in SteamOS Game Mode.

## What changed

- **Native DOM detection replaces URL-gated styling.** Steam's Game Mode route does not always appear in `window.location.pathname` or `hash`, so the old `data-glm-compact-details` marker could remain absent. Instead, the compiled Compact CSS now activates when actual Steam game header and native Play/Install section nodes are present.
- **Retires the prior in-tab CEF observer** during upgrades. A stale `v0.6.11-test.11` observer can no longer win when the newer frontend is hot-loaded.
- Includes a small temporary **COMPACT · TEST** label in the native game's header. If you see it, the new CSS is matching that real Steam page. This label will be removed after the layout is validated on the handheld.
- Native Steam cover art is still optional. If the page URL never exposes an AppID, we also try to extract the numeric AppID from an actual visible Steam CDN hero image and request the matching portrait from Steam's own CDN. No third-party token, game name, or private user data is used.
- **Real CEF diagnostics** in Decky → Game Library → Read CEF diagnostics now report: whether Compact was requested, whether Compact CSS is installed, whether the native game DOM matched, and the age of the most recent verified match (retained when QAM temporarily hides Steam's game page).
- Increments the theme revision and audit revision to ensure the latest CSS and CEF watcher are reapplied after a plugin update.

## What stays native and unchanged

Steam Install, Play, Stop, updates/download progress, space required, cloud, controller configuration, settings, Activity, Your Stuff, Community, Game Info, achievements, notes and other Steam callbacks remain Valve's own React components. GOG and other providers are unaffected. Compact styling remains **off by default** for installations that have not opted in.

## On-device test

1. Update the Game Library plugin to `v0.6.11-test.12`. No GOG reconnection required.
2. Ensure **Midnight** theme is selected, then enable **Compact Game Details · Test** under Game Library → Appearance (or Decky QAM → Game Library).
3. Open a **native Steam game's details page**, not the separate GOG details page. A small **COMPACT · TEST** tag should appear on the Steam hero, and the hero, play section and stats/section spacing should become denser.
4. If nothing changes, from that game screen open **Decky → Game Library → Read CEF diagnostics (no reload)**. Report **Compact Details requested**, **Compact CSS injected**, and **Last actual game match**. The old UI may disappear temporarily while QAM is open; the diagnostic captures the most recent real match.
5. Validate D-pad/analog navigation, A/B actions, Install/Play, controller config, settings and the Activity/Your Stuff/Community/Game Info tabs.
6. The switch can always be disabled to restore the previous layout.

**Limit:** The layout has passed automated tests but still needs a screenshot from the user's live Steam build. This is a verified code fix, **not a claim that its actual device appearance has been confirmed**.
