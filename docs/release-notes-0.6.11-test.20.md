# Game Library v0.6.11-test.20 — Restore native Game Details (Compact rollback)

The native Steam-owned game Details page is restored to the **pre-Compact Game Details experiment**. The preceding test.14–test.19 attempts to shrink the hero, inject a portrait cover and restyle HLTB/Play/Install/Activity did not produce a reliable visual redesign on the user's MSI Claw.

## Exactly what changes

- Remove the experimental **Compact Game Details · Test** toggle and its no-longer-relevant Quick Check panel from Game Library → Appearance.
- Do not return the experimental Compact CSS from the Python theme bundle. The built-in **pre-Compact Midnight** stylesheet remains unchanged; Steam's native game Details actions, original layout, HLTB plugin, controller focus and page content are left intact.
- Eliminate the native Compact installer from the frontend, prevent the old saved `compact_details=true` preference or backend call from re-enabling it, and always start with Compact off.
- Keep a rollback-only Steam CEF cleanup script that stops old Compact observers and removes their native DOM markers, blue panel tags, injected poster custom property and per-element flags. The regular theme cycle also replaces older marked Midnight CSS with the current **rev 90**, ensuring previous Compact styles cannot remain after a plugin update.
- Do not change the custom Game Library screens, GOG/Epic collections, launch behavior, achievements, HLTB data source, Steam settings, sidebar, controller navigation or the rest of the Midnight theme.
- Replace old tests of experimental Compact styling with regression tests that prohibit its injection and verify that cleanup removes all legacy native attributes and observer instances.

## Install

Install `game-library-v0.6.11-test.20.zip` through Decky Loader. The original Steam Game Details layout should return automatically, including its previous header height, native action section and no injected portrait. If an old style remains after a live plugin update, restart Steam Game Mode once so Chromium drops any old CSS from the previous Decky plugin instance.

This is a **targeted rollback**, not a full plugin downgrade: every unrelated Game Library feature and the earlier Midnight theme stays as it was before the Compact redesign work. Native on-device appearance should be visually confirmed after installation.
