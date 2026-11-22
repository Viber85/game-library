# Game Library v0.6.11-test.8 — GOG connected check, artwork and game details

## Changes

- **Plugin Settings → GOG Integration** now shows a green checkmark and current number of purchased games directly on its main integration row when the active Steam account has a connected GOG session.
- **GOG covers are fetched directly from GOG first**. GOG owned-library image metadata includes bare image hashes and domains such as \`images-2.gog-statics.com\`. Prior builds incorrectly discarded those domains and attempted to use bare hashes as display URLs.
- A GOG image without a suffix is now converted to a Galaxy portrait cover (preferred \`_glx_vertical_cover.webp\`, then \`_196.jpg\` when the first fails). Existing valid HTTPS \`.jpg\`, \`.png\` and \`.webp\` GOG image URLs are preserved. URLs from unrelated hosts are discarded.
- **One-time automatic refresh of old GOG artwork metadata** after the update, using the already connected GOG account and preserving existing library on failure. No QR reauthorization is needed.
- **Optional SteamGridDB fallback** is invoked only when a *visible* GOG cover is missing or cannot load, and only when the existing SteamGridDB API key is configured and enabled. The backend verifies the requested title/product ID against the user's owned GOG library; no Steam AppIDs are invented. Existing Steam artwork cache and key safety are reused.
- **Selecting any GOG tile with A or clicking it now opens a details view.** The details view shows the selected title, cover and ownership state and supports B / Back to return to the selected tile. D-pad and left analog navigation in the regular GOG grid remain four-directional.
- Install and Play are intentionally absent because independent GOG installation/launching is not implemented yet. No changes to Steam shortcuts or other plugins.

## Testing
Tests check GOG CDN URL normalization, malicious-domain rejection, migration of old image caches, SGDB fallback gating, connected status display, grid activation, and details focus/back actions. The Steam library and all existing navigation tests also run.

## Try it on SteamOS
1. Install \`game-library-v0.6.11-test.8.zip\`. Do **not** disconnect/reconnect GOG.
2. Open **Plugin Settings**. The GOG Integration row should have a **green checkmark** and an owned game count.
3. Open **Library → GOG**. The plugin will attempt a one-time background artwork metadata refresh on first access. You can also press **Refresh** manually if some thumbnails remain blank.
4. Select a GOG game and press **A**, or click with the touchscreen. It should display the GOG details view. Press **B** to return.
5. For any native GOG art that remains unavailable, configure and enable SteamGridDB in Plugin Settings. Only visible missing artwork is looked up.

Real device testing is still required to verify GOG's current CDN suffixes and SteamOS browser image loading. GOG is still in the read-only phase.
