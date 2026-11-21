# Game Library v0.6.10 — use native SteamOS "Space Required"

## The issue in 0.6.9

Steam Game Mode shows the actual **Space Required** figure (for example,
10.76 GB for Bright Memory: Infinite), but Game Library was often
showing a different Steam Store storage requirement.

Game Library previously called `appDetailsStore.GetAppDetails(appId)`
and subscribed to updates, **without ever invoking**
`appDetailsStore.RequestAppDetails(appId)`. If the native detail page
had not been opened, Steam's app detail cache could be empty. The Store
fallback then supplied a PC minimum/recommended requirement instead.

There was also a display mismatch: native bytes were divided by decimal
1,000,000,000 and values >= 10 GB were rounded to integers.

## Fix

- On focusing an uninstalled **Steam** game, read cached
  `lDiskSpaceRequiredBytes`. If unavailable, call native
  `appDetailsStore.RequestAppDetails(appId)` to load the same Steam
  AppDetails structure the official game details page uses.
- Use the returned `lDiskSpaceRequiredBytes` and the existing
  `SteamClient.Apps.RegisterForAppDetails` listener to update the card.
- Deduplicate concurrent native detail requests by AppID.
- Format native required space in binary units (1024³ bytes) with **two
  decimal places**, matching SteamOS's GB label more closely.
- Native value displays as **10.76 GB** (no tilde); tooltip explicitly
  identifies **Space Required · SteamOS native game details**.
- The public Steam Store minimum/recommended requirement is still a
  distinctly labeled **~GB estimate**, used only when native data
  cannot be obtained. Wait for native details before starting Store
  fallback, but allow fallback if native request stalls.
- No change to installed game folder sizes, Epic/GOG matching, tab data,
  navigation, artwork or Home/Library layout.

## Device verification

1. Update to v0.6.10, open Library > All Games, focus **Bright Memory:
   Infinite**, and allow Steam to load its app details.
2. Compare the disk number under the poster with the native Steam app
   page's **Space Required: 10.76 GB**. It should show the same value
   to two decimal places if the Steam native API returns it.
3. Focus another uninstalled Steam game and compare its poster value
   against the native app detail page.
4. A Store-only size still has a **~** prefix and may differ by GB:
   it is a minimum/recommended specification, not the native space
   required to install this depot/build.
5. Confirm installed Steam and installed Non-Steam sizes are unchanged.
6. Check keyboard/D-pad/analogue navigation through the Library.

## Limitations

Steam's private frontend stores and timing can vary between versions.
If native `RequestAppDetails` fails to yield
`lDiskSpaceRequiredBytes`, the badge keeps the approximate Store value.
This release does not download or calculate depot manifests to invent
a precise figure.

Node and TypeScript tests validate native request, deduplication, safe
fallback and exact two-decimal native formatting. Matching the specific
10.76 GB on your device still requires physical validation.
