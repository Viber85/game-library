# Game Library v0.6.11-test.5 — GOG connect from your phone (QR)

This development build replaces the failing Steam Game Mode browser sign-in with a **phone-assisted, LAN-only handoff**. No Unifideck code, credentials, or files are used.

## How to connect

1. Connect the handheld and your phone to the **same trusted private Wi-Fi** (not a hotel/guest network).
2. In Game Library open **Plugin Settings → GOG Integration → Connect GOG with phone (QR)**.
3. Scan the QR code with your phone. It opens a temporary page hosted by Game Library on the handheld, at a local address like \`http://192.168.x.x:PORT/...\`.
4. On that phone page, tap **Open GOG sign-in**. This opens the official GOG login in a new tab of your normal phone browser.
5. Complete GOG sign-in on the phone. After it redirects to the GOG login-success page, **copy its full address containing \`code=\`** from the phone address bar.
6. Return to the local Game Library tab on the **phone**, paste the GOG success URL and press **Connect GOG to Game Library**.
7. Look back at the handheld. Game Library automatically detects the authorization and synchronizes your purchased GOG library. No typing or copying on the handheld.

**Important:** GOG's existing Galaxy OAuth client uses a fixed third-party redirect URL. We cannot automatically transfer the final code between the phone's browser and the handheld without a trusted external relay or a different GOG-supported redirect. For this first private-LAN solution, there is **one copy-and-paste on the phone**, not on SteamOS.

## Implementation and safety
- Uses Game Library's own temporary Python HTTP server bound **only** to the handheld's selected RFC1918 Wi-Fi/Ethernet IPv4 address.
- Pairing address contains a randomly generated 192-bit one-use capability token; session expires after **15 minutes**. The user may cancel early.
- QR code is generated locally with the included MIT-licensed *Project Nayuki QR Code generator*. No online QR service or external pairing server.
- The temporary page links to the **official GOG sign-in**; it never asks for the GOG password or receives GOG cookies.
- The local form accepts only an official GOG success URL or authorization code, with bounded request size, exact Host, Origin checks, and limited attempts.
- Server request logs are disabled to avoid printing pairing URLs or OAuth codes.
- Credentials exchanged with GOG are then stored in the existing per-Steam-account Game Library settings folder.
- **Security tradeoff:** local handoff uses HTTP, not TLS. A trusted home Wi-Fi network is required; other devices on a compromised or public LAN might intercept the short-lived code. Never port-forward the temporary pairing listener.
- The outdated custom native popup and Steam virtual-keyboard focus patches have been removed.

## Validation and limitations
- Python unit tests exercise the local phone HTTP page, QR encoding, validation, origin/host checks, account separation, expiry, cancellation and one-time exchange.
- Controller UI, package audit and TypeScript tests are included in CI.
- **Not yet tested on the actual SteamOS device.** We must validate private IP discovery, reaching the handheld from Android/iOS and the live GOG OAuth exchange.
- This phase still reads GOG-owned games only. Downloads, installation and Proton launching are separate future work.
