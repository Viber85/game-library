import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Mobile GOG pairing is the main sign-in action, not Steam's broken browser",()=>{
  const frontend=read("src/GogIntegrationPanel.tsx");
  const pairing=read("src/GogMobilePairingPanel.tsx");
  assert.match(frontend,/<GogMobilePairingPanel accountId=\{steamId\}/);
  assert.match(pairing,/Connect GOG with phone \(QR\)/);
  assert.match(pairing,/Scan this QR code using your phone camera/);
  assert.match(pairing,/same trusted Wi-Fi/);
  assert.match(pairing,/start_gog_phone_pairing/);
  assert.match(pairing,/get_gog_phone_status/);
  assert.match(pairing,/cancel_gog_phone_pairing/);
  assert.match(pairing,/setInterval\(poll,1700\)/);
  assert.match(pairing,/window\.clearInterval\(timer\)/);
  assert.doesNotMatch(frontend,/startNativeGogLogin|gogKeyboardFocus|nativeSession/);
  assert.doesNotMatch(pairing,/Google Charts|qrserver|canvas\.toDataURL|window\.open/);
});

test("Backend phone pairing is packaged and shuts down on plugin unload",()=>{
  const backend=read("main.py");
  const packageScript=read("scripts/package.sh");
  assert.match(backend,/async def start_gog_phone_pairing/);
  assert.match(backend,/async def get_gog_phone_status/);
  assert.match(backend,/async def cancel_gog_phone_pairing/);
  assert.match(backend,/self\._gog_phone\.shutdown/);
  assert.match(packageScript,/gog_phone\.py qrcodegen\.py/);
  assert.match(packageScript,/game-library\/gog_phone\.py/);
  assert.match(packageScript,/game-library\/qrcodegen\.py/);
  assert.doesNotMatch(backend,/unifideck/);
});

test("GOG phone bridge uses local-only address, bounded tokens and no external relay",()=>{
  const service=read("gog_phone.py");
  const qr=read("qrcodegen.py");
  assert.match(service,/secrets\.token_urlsafe\(24\)/);
  assert.match(service,/ThreadingHTTPServer\(\(ip, 0\)/);
  assert.match(service,/self\.expires_at = self\.started_at \+ _LIFETIME/);
  assert.match(service,/self\.server\.shutdown\(\)/);
  assert.match(service,/self\.headers\.get\("Host"\) != session\.host/);
  assert.match(service,/self\.headers\.get\("Origin"/);
  assert.match(service,/secrets\.compare_digest/);
  assert.match(service,/self\.form_token = secrets\.token_urlsafe\(24\)/);
  assert.match(service,/self\._reject_post/);
  assert.match(service,/def log_message\(self,/);
  assert.match(service,/default-src 'none'/);
  assert.match(service,/Referrer-Policy/);
  assert.match(service,/window\.open\(link\.href, "_blank"\)/);
  assert.match(service,/script-src 'self'/);
  assert.match(qr,/MIT License/);
  assert.doesNotMatch(service,/remote\.ngrok|api\.qrserver|chart\.googleapis|unifideck/);
});
