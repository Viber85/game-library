# Game Library v0.6.11-test.6 — Fix mobile GOG pairing Forbidden (403)

## Fixed
The phone pairing page in v0.6.11-test.5 could display a blank **Forbidden** response immediately after submitting the GOG login-success link. Its exact-Origin check rejected mobile browsers that use an opaque origin, reported as \`Origin: null\`, especially when opening the pairing page from a QR scanner or browser preview.

- The local LAN handler now accepts requests with \`Origin: null\` or no Origin only if they include a **separate, random per-page CSRF token**, in addition to the existing 192-bit QR pairing URL and strict Host validation.
- Requests with an explicit foreign Origin, including external websites, remain forbidden. Requests identified as cross-site are rejected.
- On invalid or rejected submissions the phone now displays an explanation inside the Game Library page instead of a blank Forbidden response.
- The GOG code is still validated against the official \`https://embed.gog.com/on_login_success\` callback, cannot be submitted repeatedly, and is never echoed back to the phone.
- No change to other Game Library functionality, Steam libraries or Unifideck.

## GOG login now opens in a separate phone tab

- Scanning the QR opens the Game Library pairing page in the phone browser.
- Tapping **Open GOG sign-in in new tab** requests a distinct browser tab through a direct, user-initiated `window.open(..., "_blank")` call. The original pairing page remains available to paste the GOG success URL.
- Keeps the native `target="_blank"` link as a fallback if scripting is unavailable.
- Some QR scanner in-app previews do not support multiple tabs and may still ignore this. The phone page now explains how to switch to the normal Chrome/Safari browser or long-press the login link and choose Open in new tab. The plugin cannot override this limitation of the host browser.

## How to verify
1. Install **v0.6.11-test.6** from the new ZIP. Reopen **GOG Integration** and start **a new QR pairing session**; old QR links cannot be reused.
2. Open the pairing page on the phone connected to the same private Wi-Fi as the handheld. Use Chrome or Safari rather than an in-app QR preview if possible.
3. Sign in at GOG in the phone browser, then paste the final GOG success URL containing \`code=\` into the Game Library phone form.
4. Press Connect GOG to Game Library. The phone should display **GOG authorization sent** rather than Forbidden, while Game Library exchanges the code and shows the connection outcome.

A GOG login-success URL is short-lived and one-use; if it has expired, sign in again to obtain a new one.

## Tests
- Complete private HTTP form handoff using a phone-style opaque \`Origin: null\`, with one-use GOG code exchange.
- Missing/wrong form nonce is rejected with an explanatory page.
- Forged explicit Origin and cross-site requests remain forbidden even if they know the pairing URL and page token.
- Existing QR generation, account isolation, source checks and packaging tests still run.

Mobile browser behavior and live GOG account exchange still require a handheld test. No login credentials are collected by our plugin. Because local pairing uses plain HTTP, use a trusted private Wi-Fi only, never public Wi-Fi.
