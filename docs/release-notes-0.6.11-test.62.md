# Game Library v0.6.11-test.62 — pre-install GOG space and achievements

## MSI Claw issue

On GOG Game Details, **Space Required** remained empty until the Install dialog was opened, because the UI only called gogdl preflight from the Install click handler. **Achievements** was a hardcoded “Unavailable” placeholder without any GOG achievement request.

## Changes

- When selecting a GOG title, Game Library immediately requests the Windows installation size in the background through its existing authenticated `gogdl info` preflight. Installation does not begin and no drive is changed. The size card initially says Checking…; a valid result appears as GB or MB, with zero/invalid data represented by a dash rather than false 0.0 GB.
- Fixed the gogdl v1/v2 size parser: `size["*"]` is only the shared depots. Language-specific depots contribute additional disk usage. Prefer reported English depot size where available and conservatively use the largest other language depot otherwise.
- GOG Achievements now attempts to read the **connected account's own** achievements via the GOG Galaxy gameplay API, using the owned GOG product ID and authenticated account user ID. No Steam achievements are borrowed for non-Steam games.
- If the response has a complete verified list, display unlocked / total, percentage and a thin progress bar, even when the game has not been installed. A verified zero-achievement list says “No achievements”.
- GOG titles with no available Galaxy achievement list, incomplete paginated data, unsupported client ID mapping, authentication error or insufficient API support continue to show **Unavailable** rather than invented 0/0. Some classic GOG games do not support achievements.
- Each GOG data request is isolated by the selected game and account and discarded if the page changes mid-request. Achievement summaries are cached briefly in the private Python process.

## Scope and known limitations

- This is a read-only metadata change. Existing Steam and GOG installation, Pause/Resume/Cancel, Proton launch registration, Steam shortcuts, artwork and layout remain untouched.
- A GOG Galaxy achievement API response is not guaranteed for every GOG product. Unavailable does **not** imply zero earned achievements.
- The storage number is an estimate based on the gogdl Windows build and English/default-language depots. Actual size may vary slightly with other languages and updates. Without a verified gogdl size, the card remains a dash.
- On slow GOG network/auth calls, initial metadata might take several seconds to arrive. It does not block opening Game Details.

## MSI Claw checks

1. Open a GOG game that is **not installed**; Space Required should show Checking… and then a size without pressing Install.
2. Check a small title where shared depot size is zero but language files are nonzero. The UI should show MB rather than an inaccurate 0.0 GB.
3. Open a GOG game known to support GOG Galaxy achievements; when the account API returns the complete list, verify correct unlocked/total and progress.
4. Open a classic unsupported title: expect “Unavailable” or “No achievements” only when those states are confirmed by GOG; no fake zero-percent tracker.
5. Confirm Steam Details and native installation remain unchanged.

Automated tests validate parsing, account scoping, endpoint validation, incomplete achievement lists and frontend rendering. Real GOG API results require on-device validation.
