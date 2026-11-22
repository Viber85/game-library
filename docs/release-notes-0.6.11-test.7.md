# Game Library v0.6.11-test.7 — GOG authorization HTTPS exchange

## Problem confirmed by device screenshots
The local QR flow and phone form successfully accept the GOG success URL and display "GOG authorization sent", but the handheld may show **Unable to reach GOG. Check the internet connection.** That generic error originates inside Game Library's Python HTTPS request layer; it is **not** proof that the user's internet is down.

## Changes
- Use a **verified HTTPS SSL context** from the trusted \`certifi\` CA bundle provided by Decky Python when available, otherwise fall back to known SteamOS/Linux CA paths, then Python's default certificate store. TLS verification and hostname checks stay enabled. No insecure TLS bypass.
- GOG OAuth token and library requests now distinguish certificate verification errors, TLS handshakes, DNS failure, network timeout, connection reset/refusal and the HTTP codes returned by GOG.
- Errors identify the exact stage: **GOG token exchange**, **GOG account profile**, or **GOG library synchronization**. They never echo login URLs, one-use codes, access tokens or refresh tokens.
- A rejected one-use login code (GOG HTTP 400) now explicitly asks for a new GOG sign-in, rather than suggesting an internet outage.
- A partially failed sync still preserves an existing complete library cache. Local QR form, two-tab mobile flow, 15-minute pairing, and controller navigation are unchanged.
- No Unifideck code, data or dependencies are used.

## Testing steps
1. Install \`game-library-v0.6.11-test.7.zip\` via Decky Loader.
2. Open **Settings → GOG Integration → Connect GOG with phone (QR)** and start a **new** QR session.
3. Scan the QR, open GOG in its own phone browser tab, complete sign-in, and copy the **new** GOG success URL containing \`code=\`.
4. Return to the phone's Game Library pairing form and press **Connect GOG to Game Library**.
5. Watch the handheld. Successful authorization will connect your account; if the network fails, the red message now identifies whether the issue is TLS/CA, DNS, timeout, remote HTTP response, or GOG library sync.

Authorization codes are one-use and short-lived; previously submitted codes must not be reused.

## Offline tests
- Tests verify a trusted certifi CA bundle takes precedence over incomplete system CA paths and that all HTTPS requests use a verified context.
- Tests cover distinct TLS, DNS, timeout and connection-refused errors without revealing a code.
- Tests confirm that GOG HTTP 400 is distinguishable from connectivity failures and that cached games are preserved if synchronization fails.

Actual Decky/SteamOS HTTPS connectivity and GOG authorization still need confirmation on the handheld.
