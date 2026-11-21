# Game Library v0.6.8 — Install Size: verified Steam references for Non-Steam games

## Scope
Game Library already displays accurate installed-size metadata from SteamOS
for installed Steam titles; local measurements for installed Non-Steam
Windows shortcuts, Flatpak and AppImage; and an estimated disk requirement
for uninstalled Steam Store titles. This update keeps those features intact.

### New
- When **an uninstalled Non-Steam game already has a linked Steam AppID**
  in Steam's game overview metadata, the selected Library card may show
  the public Steam Store storage requirement for the corresponding PC
  release as a *comparison*.
- The Steam Store product name **must match** the shortcut title after
  normalizing case, accents and punctuation. Different editions/bundles,
  ambiguous mappings, empty names or absent IDs yield **—** rather
  than a potentially incorrect estimate.
- The display uses **~** before the size and identifies the source in
  its tooltip/accessibility description as **Steam reference only**;
  Epic/GOG releases may need different storage.
- Steam Store responses now include the official product name so the
  UI can verify matches. Legacy positive size-cache entries without a
  product name are refreshed on the next focused lookup.
- No background catalogue sweep: only a selected Library card can start
  a public metadata request after its existing 850 ms focus delay,
  using the same cache, deduplication, throttle and rate-limit rules.
- No login, store credentials, dependencies on third-party Decky
  plugin code, downloads or new installations.

### Still planned
This update does **not** fetch the native Epic/GOG game size from Epic/GOG
product pages. For that, the own storefront integration needs a verified
provider product ID and a reliable metadata source per purchased game.
An unmatched uninstalled Non-Steam entry still shows **—**.

### Verification
1. Open Library and focus an installed Steam game: keep its measured GB.
2. Focus an installed Non-Steam EXE, Flatpak or AppImage: keep its local GB.
3. Focus an uninstalled Steam game: show ~GB if Steam Store lists storage.
4. Focus an uninstalled Non-Steam game with a matching Steam reference:
   show ~GB; the description clarifies *Steam reference only*.
5. Focus a game with a missing or mismatched product identifier:
   show —, never invent an approximate size from its title.
6. Rapidly scroll through hundreds of cards: only the selected card
   makes a Store request after its focus delay.
7. Confirm Home, Library controller navigation, Settings and the
   partially working My Collections page are otherwise unchanged.

Automated TypeScript, JS, Python and packaging tests run via GitHub
Actions; live SteamOS behavior still requires a handheld check.
