"""One-time, LAN-only phone handoff for Game Library's own GOG account.

No remote relay, no Unifideck dependency and no password handling. A phone on
the same trusted Wi-Fi opens a local form, signs into GOG in a normal browser,
then pastes the resulting one-use GOG success URL into that local form. The
only credential forwarded to the handheld is GOG's short-lived OAuth code.

HTTP (not TLS) is intentionally limited to the selected local RFC1918 IPv4
interface, a cryptographically random 192-bit capability URL, a 15-minute
expiry and one-use exchange. The user's Wi-Fi must be trusted. Do not route
this listener to the internet or expose it over public/hotel networks.
"""
from __future__ import annotations

import base64
import fcntl
import html
import importlib.util
import ipaddress
import pathlib
import re
import secrets
import socket
import struct
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

_ROOT = pathlib.Path(__file__).resolve().parent
_LIFETIME = 15 * 60
_ACTIVE = None
_ACTIVE_LOCK = threading.RLock()
_MAX_BODY = 4096
_TOKEN_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{20,80}$")
_CODE_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{12,1024}$")


def _local_module(name):
    path = _ROOT / (name + ".py")
    spec = importlib.util.spec_from_file_location("game_library_phone_" + name, str(path))
    if not spec or not spec.loader:
        raise RuntimeError("Packaged GOG phone support missing: " + name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _lan_ipv4():
    """Identify an RFC1918 Wi-Fi/Ethernet address without using any cloud service."""
    candidates = []
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        for _, name in socket.if_nameindex():
            if name.startswith(("lo", "docker", "veth", "virbr", "br-", "tun", "tap")):
                continue
            try:
                raw = fcntl.ioctl(sock.fileno(), 0x8915,
                                  struct.pack("256s", name[:15].encode("ascii")))
                addr = socket.inet_ntoa(raw[20:24])
                ip = ipaddress.IPv4Address(addr)
                if not (ip in ipaddress.ip_network("10.0.0.0/8") or
                        ip in ipaddress.ip_network("172.16.0.0/12") or
                        ip in ipaddress.ip_network("192.168.0.0/16")):
                    continue
                rank = 0 if name.startswith(("wl", "wlan")) else (
                    1 if name.startswith(("en", "eth")) else 2)
                candidates.append((rank, name, addr))
            except (OSError, UnicodeError, ValueError):
                continue
    return sorted(candidates)[0][2] if candidates else None


def _validated_code(raw):
    if not isinstance(raw, str) or len(raw) > 2048:
        raise ValueError("Paste the complete GOG login-success URL.")
    raw = raw.strip()
    if raw.startswith("https://"):
        parsed = urllib.parse.urlparse(raw)
        if (parsed.scheme != "https" or parsed.hostname != "embed.gog.com" or
            parsed.path != "/on_login_success" or parsed.username or
            parsed.password or parsed.port or
            urllib.parse.parse_qs(parsed.query).get("origin") != ["client"]):
            raise ValueError("This is not the official GOG login-success URL.")
        codes = urllib.parse.parse_qs(parsed.query).get("code", [])
        raw = codes[0] if len(codes) == 1 else ""
    if not _CODE_PATTERN.fullmatch(raw):
        raise ValueError("No valid GOG authorization code was found.")
    return raw


def _svg_qr(text):
    """Produce a local QR SVG: MIT-licensed Nayuki encoder, never a web API."""
    qrmod = _local_module("qrcodegen")
    qr = qrmod.QrCode.encode_text(text, qrmod.QrCode.Ecc.MEDIUM)
    size = qr.get_size()
    margin = 4
    coords = []
    for y in range(size):
        for x in range(size):
            if qr.get_module(x, y):
                coords.append("M%d %dh1v1h-1z" % (x + margin, y + margin))
    pixels = size + 2 * margin
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
           'shape-rendering="crispEdges"><rect width="%d" height="%d" '
           'fill="#fff"/><path d="%s" fill="#111"/></svg>'
           % (pixels, pixels, pixels, pixels, " ".join(coords)))
    return base64.b64encode(svg.encode("ascii")).decode("ascii")


def _html_page(session, message="", *, error=False):
    url = html.escape(session.login_url, quote=True)
    title = "Game Library · GOG"
    note = ('<p class="alert">' + html.escape(message) + '</p>') if message else ""
    if error:
        note = note.replace('class="alert"', 'class="alert error"')
    action = "/" + session.secret + "/submit"
    return ("""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><title>%s</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#071829;
font:16px/1.55 system-ui,sans-serif;color:#e8f2fb;padding:24px}
main{max-width:480px;margin:12px auto}.panel{border:1px solid #32618d;
border-radius:16px;background:#102c47;padding:22px}
h1{font-size:23px;margin:0 0 8px}h2{font-size:17px;margin:22px 0 8px}
p{margin:8px 0 12px;color:#b7cfe1}.step{font-weight:bold;color:#8dd6ff}
a.button,button{display:block;width:100%%;text-align:center;background:#088ee1;
color:#fff;border:none;border-radius:10px;padding:14px;font:bold 16px system-ui;
text-decoration:none;cursor:pointer;margin:14px 0}
textarea{display:block;width:100%%;min-height:120px;resize:vertical;padding:12px;
border:1px solid #5b89ae;border-radius:9px;color:#fff;background:#061727;
font:15px system-ui}.hint{font-size:13px}.alert{padding:10px;border-radius:9px;
background:#154e5a}.alert.error{background:#713640}
</style></head><body><main><div class="panel"><h1>%s</h1>
<p>Connect your account without typing on the SteamOS keyboard.</p>
<p class="step">1 · Open GOG in another browser tab</p>
<a class="button" href="%s" target="_blank" rel="noopener noreferrer">Open GOG sign-in</a>
<p>Log in using your normal phone browser. Never enter your password in this page.</p>
<p class="step">2 · Copy the GOG success-page address</p>
<p>After GOG signs you in, tap the address bar and copy the full URL
containing <b>code=</b>. Return to this Game Library tab.</p>
<p class="step">3 · Send the one-use link to your handheld</p>
<form method="post" action="%s" autocomplete="off">
<textarea name="gog_url" required maxlength="2048" spellcheck="false"
placeholder="Paste the complete GOG success URL here"></textarea>
<button type="submit">Connect GOG to Game Library</button></form>%s
<p class="hint">This page is served only by your handheld on local Wi-Fi.
The code is transferred once, never your password. Close this page afterward.</p>
</div></main></body></html>"""
            % (title, title, url, action, note)).encode("utf-8")


class _Handler(BaseHTTPRequestHandler):
    server_version = "GameLibraryPairing"
    protocol_version = "HTTP/1.0"
    session = None

    def log_message(self, format, *args):
        # Never record access paths (secret) or posted authorization codes.
        return

    def _headers(self, code, content_length, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(content_length))
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy",
                         "default-src 'none'; style-src 'unsafe-inline'; "
                         "form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()

    def _send(self, code, body, ctype="text/html; charset=utf-8"):
        self._headers(code, len(body), ctype)
        self.wfile.write(body)

    def _permitted(self, suffix):
        session = self.session
        if self.headers.get("Host") != session.host:
            return False
        addr = self.client_address[0]
        try:
            remote = ipaddress.ip_address(addr)
            if not (remote.is_private or remote.is_loopback):
                return False
        except ValueError:
            return False
        if self.path != "/" + session.secret + suffix:
            return False
        with session.lock:
            return session.phase in ("waiting", "error") and time.time() < session.expires_at

    def do_GET(self):
        if not self._permitted("/"):
            self._send(404, b"Unavailable")
            return
        self._send(200, _html_page(self.session))

    def do_POST(self):
        if not self._permitted("/submit"):
            self._send(404, b"Unavailable")
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0] != "application/x-www-form-urlencoded":
            self._send(415, b"Unsupported form")
            return
        try:
            length = int(self.headers.get("Content-Length", "-1"))
        except ValueError:
            length = -1
        if length <= 0 or length > _MAX_BODY:
            self._send(413, b"Invalid request size")
            return
        origin = self.headers.get("Origin")
        if origin and origin != "http://" + self.session.host:
            self._send(403, b"Forbidden")
            return
        data = self.rfile.read(length)
        try:
            fields = urllib.parse.parse_qs(data.decode("utf-8"), max_num_fields=4)
            values = fields.get("gog_url", [])
            code = _validated_code(values[0] if len(values) == 1 else "")
        except (ValueError, UnicodeError) as exc:
            self._send(400, _html_page(self.session, str(exc), error=True))
            return
        if not self.session.submit(code):
            self._send(409, b"Pairing is already in progress")
            return
        self._send(202, ("""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#071829;color:white;font:18px system-ui;padding:28px">
<h2>GOG authorization sent</h2><p>Return to Game Library on your handheld.
It will show the account connection result.</p>
<p>If the connection fails, start GOG login again from the pairing page.</p>
</body></html>""").encode("utf-8"))


class _Session:
    def __init__(self, account, ip, gog):
        self.account = account
        self.ip = ip
        self.gog = gog
        self.secret = secrets.token_urlsafe(24)
        self.started_at = time.time()
        self.expires_at = self.started_at + _LIFETIME
        self.login_url = gog.login_url()
        self.lock = threading.RLock()
        self.phase = "waiting"
        self.message = ""
        self.count = None
        self.attempts = 0
        handler_cls = type("PrivateGogPhoneHandler", (_Handler,), {"session": self})
        self.server = ThreadingHTTPServer((ip, 0), handler_cls)
        self.server.daemon_threads = True
        self.server.request_queue_size = 6
        self.port = self.server.server_address[1]
        self.host = "%s:%d" % (ip, self.port)
        self.url = "http://%s/%s/" % (self.host, self.secret)
        self.qr = _svg_qr(self.url)
        self.thread = threading.Thread(target=self.server.serve_forever,
                                       name="game-library-gog-mobile", daemon=True)
        self.thread.start()
        self.expiration = threading.Timer(_LIFETIME, self.expire)
        self.expiration.daemon = True
        self.expiration.start()

    def result(self):
        with self.lock:
            return {"ok": True, "phase": self.phase, "message": self.message,
                    "expires_at": int(self.expires_at),
                    "url": self.url if self.phase in ("waiting", "error") else "",
                    "qr": self.qr if self.phase in ("waiting", "error") else "",
                    "count": self.count}

    def _close_listener(self):
        # Called off the HTTP handler thread, or from the backend RPC thread.
        try:
            self.server.shutdown()
            self.server.server_close()
        except OSError:
            pass

    def stop(self, phase):
        with self.lock:
            if self.phase in ("connected", "expired", "cancelled"):
                return
            self.phase = phase
            self.secret = ""
            self.qr = ""
            self.url = ""
            self.expiration.cancel()
        self._close_listener()

    def expire(self):
        with self.lock:
            if self.phase in ("connected", "expired", "cancelled"):
                return
        self.stop("expired")

    def submit(self, code):
        with self.lock:
            if self.phase not in ("waiting", "error") or time.time() >= self.expires_at:
                return False
            if self.attempts >= 3:
                return False
            self.attempts += 1
            self.phase = "exchanging"
            self.message = "GOG authorized on your phone. Connecting account…"
        thread = threading.Thread(target=self._exchange, args=(code,),
                                  name="game-library-gog-code-exchange", daemon=True)
        thread.start()
        return True

    def _exchange(self, code):
        try:
            result = self.gog.connect(self.account, code)
            with self.lock:
                if self.phase != "exchanging":
                    return
                if result.get("ok") and result.get("connected"):
                    self.phase = "connected"
                    self.count = result.get("count", 0)
                    self.message = result.get("warning") or "GOG account connected."
                    self.secret = ""
                    self.url = ""
                    self.qr = ""
                    self.expiration.cancel()
                    should_close = True
                else:
                    self.phase = "error"
                    self.message = str(result.get("reason") or "GOG rejected the code.")[:180]
                    should_close = self.attempts >= 3
                    if should_close:
                        self.phase = "expired"
                        self.message = "Too many failed attempts. Start a new phone pairing."
                        self.secret = ""
                        self.url = ""
                        self.qr = ""
                        self.expiration.cancel()
            if should_close:
                self._close_listener()
        except Exception:
            with self.lock:
                if self.phase == "exchanging":
                    self.phase = "error"
                    self.message = "Could not connect GOG. Start a new pairing session."
            # Do not log sensitive URLs or authorization codes.


def start(account):
    global _ACTIVE
    gog = _local_module("gog")
    try:
        account = gog._account(account)
    except gog.GogError:
        return {"ok": False, "reason": "Steam account unavailable."}

    with _ACTIVE_LOCK:
        if _ACTIVE is not None and _ACTIVE.account == account:
            snapshot = _ACTIVE.result()
            if snapshot["phase"] in ("waiting", "error", "exchanging"):
                return snapshot
        if _ACTIVE is not None:
            _ACTIVE.stop("cancelled")
        ip = _lan_ipv4()
        if not ip:
            _ACTIVE = None
            return {"ok": False, "reason": "No private Wi-Fi/LAN IP found. Connect both devices to the same trusted Wi-Fi."}
        try:
            session = _Session(account, ip, gog)
        except (OSError, ValueError, RuntimeError):
            _ACTIVE = None
            return {"ok": False, "reason": "Could not start local phone pairing. Check network and restart Decky."}
        _ACTIVE = session
        return session.result()


def status(account):
    try:
        gog = _local_module("gog")
        account = gog._account(account)
    except gog.GogError:
        return {"ok": False, "reason": "Steam account unavailable."}
    with _ACTIVE_LOCK:
        active = _ACTIVE
    if active is None or active.account != account:
        return {"ok": True, "phase": "idle"}
    return active.result()


def cancel(account):
    global _ACTIVE
    try:
        gog = _local_module("gog")
        account = gog._account(account)
    except gog.GogError:
        return {"ok": False, "reason": "Steam account unavailable."}
    with _ACTIVE_LOCK:
        active = _ACTIVE
        if active is None or active.account != account:
            return {"ok": True}
        active.stop("cancelled")
        _ACTIVE = None
    return {"ok": True}


def shutdown():
    global _ACTIVE
    with _ACTIVE_LOCK:
        if _ACTIVE is not None:
            _ACTIVE.stop("cancelled")
        _ACTIVE = None
