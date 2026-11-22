# Game Library v0.6.11-test.6 — Fix mobile GOG pairing Forbidden (403)

## Fixed
The phone pairing page in v0.6.11-test.5 could display a blank **Forbidden** response immediately after submitting the GOG login-success link. Its exact-Origin check rejected mobile browsers that use an opaque origin, reported as \`Origin: null\`, especially when opening the pairing page from a QR scanner or browser preview.

- The local LAN handler now accepts requests with \`Origin: null\` or no Origin only if they include a **separate, random per-page CSRF token**, in addition to the existing 192-bit QR pairing URL and strict Host validation.
- Requests with an explicit foreign Origin, including external websites, remain forbidden. Requests identified as cross-site are rejected.
- On invalid or rejected submissions the phone now displays an explanation inside the Game Library page instead of a blank Forbidden response.
- The GOG code is still validated against the official \`https://embed.gog.com/on_login_success\` callback, cannot be submitted repeatedly, and is never echoed back to the phone.
- No change to other Game Library functionality, Steam libraries or Unifideck.

## How to verify
1. Install **v0.6.11-test.6** from the new ZIP. Reopen **GOG Integration** and start **a new QR pairing session**; old QR links cannot be reused.
2. Open the pairing page on the phone connected to the same private Wi-Fi as the handheld.
3. Sign in at GOG in the phone browser, then paste the final GOG success URL containing \`code=\` into the Game Library phone form.
4. Press Connect GOG to Game Library. The phone should display **GOG authorization sent** rather than Forbidden, while Game Library exchanges the code and shows the connection outcome.

A GOG login-success URL is short-lived and one-use; if it has expired, sign in again to obtain a new one.

## Tests
- Complete private HTTP form handoff using a phone-style opaque \`Origin: null\`, with one-use GOG code exchange.
- Missing/wrong form nonce is rejected with an explanatory page.
- Forged explicit Origin and cross-site requests remain forbidden even if they know the pairing URL and page token.
- Existing QR generation, account isolation, source checks and packaging tests still run.

Mobile browser behavior and live GOG account exchange still require a handheld test. No login credentials are collected by our plugin. Because local pairing uses plain HTTP, use a trusted private Wi-Fi only, never public Wi-Fi.
