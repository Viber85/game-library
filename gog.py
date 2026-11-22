"""Independent, read-only GOG account library connector for Game Library.

This module was written specifically for Game Library. It uses GOG's public
OAuth-compatible Galaxy login endpoints and owned-products HTTP endpoint.
It never reads another plugin's code, configuration, installed-game markers,
Steam shortcuts, or credentials. No installation/launching is implemented.
"""
import json
import os
import pathlib
import re
import socket
import ssl
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

_CLIENT = "46899977096215655"  # Public GOG Galaxy client identifier.
_SECRET = "9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9"  # Public Galaxy credential; NOT a private user secret.
_REDIRECT = "https://embed.gog.com/on_login_success?origin=client"
_LOGIN = "https://auth.gog.com/auth"
_TOKEN = "https://auth.gog.com/token"
_PRODUCTS = "https://embed.gog.com/account/getFilteredProducts"
_PROFILE = "https://embed.gog.com/userData.json"
_MAX_PAGES = 500
_MAX_GAMES = 25000
_UA = "GameLibrary/0.6.11"
# SteamOS / Decky Python processes can lack a complete system CA trust store.
# Prefer Decky-provided certifi, then a verified Linux CA bundle. Never use
# CERT_NONE, unverified_context(), or disable hostname verification.
_CA_FILES = (
    "/etc/ssl/certs/ca-certificates.crt",
    "/etc/pki/tls/certs/ca-bundle.crt",
    "/etc/ssl/ca-bundle.pem",
    "/etc/ssl/cert.pem",
)
_TLS_CONTEXT = None


class GogError(Exception):
    """Safe user-displayable provider failure; contains no credentials."""


def _account(account):
    if not isinstance(account, str) or not re.fullmatch(r"[1-9][0-9]{0,11}", account):
        raise GogError("Active Steam account is unavailable.")
    return account


def _folder(account):
    root = pathlib.Path(os.environ.get("DECKY_PLUGIN_SETTINGS_DIR") or
                        (pathlib.Path(__file__).resolve().parent / ".gog_private"))
    directory = root / "gog_accounts" / _account(account)
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    if directory.is_symlink():
        raise GogError("Account storage path is not safe.")
    os.chmod(directory, 0o700)
    return directory


def _read_json(path):
    try:
        if not path.is_file() or path.is_symlink() or path.stat().st_size > 3_000_000:
            return None
        with path.open("r", encoding="utf-8") as stream:
            value = json.load(stream)
        return value if isinstance(value, dict) else None
    except (OSError, ValueError, TypeError):
        return None


def _atomic_json(path, value):
    """Replace a credential/cache file without exposing partly written data."""
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    name = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=str(path.parent),
                                         prefix=".gog-", delete=False) as stream:
            name = stream.name
            os.fchmod(stream.fileno(), 0o600)
            json.dump(value, stream, ensure_ascii=False, separators=(",", ":"))
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
        os.chmod(path, 0o600)
    finally:
        if name and os.path.exists(name):
            os.unlink(name)


def _tls_context():
    """Verified HTTPS trust root, including Decky's bundled certifi when present."""
    global _TLS_CONTEXT
    if _TLS_CONTEXT is not None:
        return _TLS_CONTEXT

    paths = []
    try:
        import certifi
        paths.append(certifi.where())
    except (ImportError, OSError, AttributeError):
        pass
    paths.extend(_CA_FILES)
    for candidate in paths:
        try:
            if candidate and pathlib.Path(candidate).is_file():
                _TLS_CONTEXT = ssl.create_default_context(cafile=str(candidate))
                return _TLS_CONTEXT
        except (OSError, ValueError, ssl.SSLError):
            continue
    # Do not weaken verification if the operating system has no CA file.
    _TLS_CONTEXT = ssl.create_default_context()
    return _TLS_CONTEXT


def _request_label(parsed):
    """Stage names must never incorporate token/code/query strings."""
    if parsed.hostname == "auth.gog.com":
        return "GOG token exchange"
    if parsed.path == "/userData.json":
        return "GOG account profile"
    return "GOG library synchronization"


def _network_failure(error, stage):
    """Classify Python/Decky network failures without leaking the request URL."""
    reason = error.reason if isinstance(error, urllib.error.URLError) else error
    if isinstance(reason, ssl.SSLCertVerificationError):
        return (stage + ": HTTPS certificate validation failed on SteamOS. "
                "Check the system date/time and trusted CA certificates.")
    if isinstance(reason, ssl.SSLError):
        return stage + ": TLS handshake failed. Verify SteamOS HTTPS certificate support."
    if isinstance(reason, (socket.timeout, TimeoutError)):
        return (stage + ": connection timed out. Check handheld networking, "
                "DNS or IPv6 routing to GOG.")
    if isinstance(reason, socket.gaierror):
        return stage + ": DNS could not resolve GOG. Check the handheld's DNS/network."
    if isinstance(reason, (ConnectionRefusedError, ConnectionResetError)):
        return stage + ": connection was refused or reset by the remote server."
    return stage + ": HTTPS connection failed on the handheld. Check SteamOS network/CA settings."


def _http_json(url, access=None):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ("auth.gog.com", "embed.gog.com"):
        raise GogError("Invalid GOG endpoint.")
    stage = _request_label(parsed)
    headers = {"Accept": "application/json", "User-Agent": _UA}
    if access:
        headers["Authorization"] = "Bearer " + access
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=18, context=_tls_context()) as response:
            if response.status != 200:
                raise GogError(stage + ": GOG returned HTTP " + str(response.status) + ".")
            body = response.read(2_000_001)
        if len(body) > 2_000_000:
            raise GogError(stage + ": GOG response was too large.")
        data = json.loads(body)
        if not isinstance(data, dict):
            raise ValueError("Not an object")
        return data
    except urllib.error.HTTPError as error:
        if error.code == 400 and parsed.hostname == "auth.gog.com":
            raise GogError(
                "GOG token exchange: GOG rejected this authorization code (HTTP 400). "
                "Sign in again to get a fresh one-use code."
            ) from None
        if error.code == 401:
            raise GogError(stage + ": GOG session expired. Sign in again.") from None
        if error.code == 403:
            raise GogError(stage + ": access denied by GOG (HTTP 403).") from None
        if error.code == 429:
            raise GogError(stage + ": GOG rate limit reached. Try again later.") from None
        raise GogError(stage + ": GOG returned HTTP " + str(error.code) + ".") from None
    except (urllib.error.URLError, TimeoutError, OSError, ssl.SSLError) as error:
        raise GogError(_network_failure(error, stage)) from None
    except (UnicodeError, ValueError):
        raise GogError(stage + ": GOG returned invalid JSON.") from None


def login_url():
    return _LOGIN + "?" + urllib.parse.urlencode({
        "client_id": _CLIENT, "redirect_uri": _REDIRECT,
        "response_type": "code", "layout": "client2",
    })


def _authorization_code(value):
    if not isinstance(value, str) or len(value) > 2048:
        raise GogError("Paste the GOG authorization code or complete redirect URL.")
    supplied = value.strip()
    if supplied.startswith("https://"):
        parsed = urllib.parse.urlparse(supplied)
        if parsed.hostname not in ("embed.gog.com", "www.gog.com") or (
            parsed.path != "/on_login_success"
        ):
            raise GogError("This is not the GOG login-success URL.")
        codes = urllib.parse.parse_qs(parsed.query).get("code", [])
        supplied = codes[0] if len(codes) == 1 else ""
    if not re.fullmatch(r"[A-Za-z0-9_-]{12,1024}", supplied):
        raise GogError("No valid authorization code found in the pasted value.")
    return supplied


def _token_request(parameters):
    result = _http_json(_TOKEN + "?" + urllib.parse.urlencode({
        "client_id": _CLIENT, "client_secret": _SECRET, **parameters,
    }))
    access, refresh = result.get("access_token"), result.get("refresh_token")
    if not isinstance(access, str) or not access or not isinstance(refresh, str) or not refresh:
        raise GogError("GOG did not return a valid session.")
    duration = result.get("expires_in", 3600)
    try:
        duration = max(120, min(int(duration), 86400 * 30))
    except (ValueError, TypeError):
        duration = 3600
    return {"access": access, "refresh": refresh,
            "expires_at": time.time() + duration, "username": ""}


def _load_session(account):
    session = _read_json(_folder(account) / "session.json")
    if not session or not isinstance(session.get("access"), str) or not isinstance(session.get("refresh"), str):
        return None
    return session


def _active_session(account, *, renew=False):
    session = _load_session(account)
    if session is None:
        raise GogError("Connect your GOG account in Plugin Settings.")
    if renew or float(session.get("expires_at", 0)) <= time.time() + 180:
        refreshed = _token_request({
            "grant_type": "refresh_token", "refresh_token": session["refresh"],
        })
        refreshed["username"] = session.get("username", "")
        _atomic_json(_folder(account) / "session.json", refreshed)
        return refreshed
    return session


def _gog_image(value):
    if not isinstance(value, str) or len(value) > 1024:
        return ""
    candidate = ("https:" + value) if value.startswith("//") else value
    try:
        parsed = urllib.parse.urlparse(candidate)
        if (parsed.scheme == "https" and parsed.hostname and
            (parsed.hostname == "gog.com" or parsed.hostname.endswith(".gog.com"))):
            return candidate
    except ValueError:
        pass
    return ""


def _library_items(access):
    games, seen = [], set()
    total_pages = 1
    for page in range(1, _MAX_PAGES + 1):
        if page > total_pages:
            break
        url = _PRODUCTS + "?" + urllib.parse.urlencode({"mediaType": 1, "page": page})
        data = _http_json(url, access)
        try:
            reported = int(data.get("totalPages", 1))
        except (ValueError, TypeError):
            raise GogError("GOG returned an invalid page count.") from None
        if reported < 1 or reported > _MAX_PAGES:
            raise GogError("GOG library is too large to sync safely.")
        total_pages = reported
        products = data.get("products")
        if not isinstance(products, list):
            raise GogError("GOG returned an invalid product list.")
        for item in products:
            if not isinstance(item, dict):
                continue
            product_id = str(item.get("id", "")).strip()
            name = item.get("title", "")
            if not re.fullmatch(r"[0-9]{1,20}", product_id) or not isinstance(name, str):
                continue
            name = name.strip()[:300]
            if not name or product_id in seen:
                continue
            seen.add(product_id)
            games.append({"id": product_id, "title": name,
                          "image": _gog_image(item.get("image")),
                          "background": _gog_image(item.get("backgroundImage"))})
            if len(games) > _MAX_GAMES:
                raise GogError("GOG returned more games than the supported limit.")
    else:
        raise GogError("GOG library pagination exceeded the supported limit.")
    return sorted(games, key=lambda game: (game["title"].casefold(), game["id"]))


def _sync_with_session(account, session):
    try:
        games = _library_items(session["access"])
    except GogError as error:
        if "session expired" not in str(error):
            raise
        session = _active_session(account, renew=True)
        games = _library_items(session["access"])
    value = {"games": games, "synced_at": int(time.time())}
    _atomic_json(_folder(account) / "library.json", value)
    return {"ok": True, "count": len(games), "synced_at": value["synced_at"]}


def status(account):
    try:
        connected = _load_session(account) is not None
        library = _read_json(_folder(account) / "library.json") or {}
        games = library.get("games", [])
        session = _load_session(account) or {}
        return {"ok": True, "connected": connected,
                "username": str(session.get("username", ""))[:120] if connected else "",
                "count": len(games) if connected and isinstance(games, list) else 0,
                "synced_at": library.get("synced_at", 0) if connected else 0,
                "login_url": login_url()}
    except (OSError, GogError):
        return {"ok": False, "connected": False, "reason": "GOG settings unavailable."}


def library(account):
    result = status(account)
    if not result.get("connected"):
        return {"ok": False, "reason": "Connect your GOG account in Plugin Settings.", "games": []}
    cache = _read_json(_folder(account) / "library.json")
    games = cache.get("games", []) if cache else []
    if not isinstance(games, list):
        games = []
    return {"ok": True, "games": games, "synced_at": cache.get("synced_at", 0) if cache else 0}


def connect(account, value):
    try:
        account = _account(account)
        code = _authorization_code(value)
        session = _token_request({"grant_type": "authorization_code",
                                  "code": code, "redirect_uri": _REDIRECT})
        try:
            profile = _http_json(_PROFILE, session["access"])
            session["username"] = str(profile.get("username", ""))[:120]
        except GogError:
            pass
        _atomic_json(_folder(account) / "session.json", session)
        # A re-login must never expose cached games from a different GOG account.
        (_folder(account) / "library.json").unlink(missing_ok=True)
        try:
            result = _sync_with_session(account, session)
            return {**result, "connected": True, "username": session["username"]}
        except GogError as error:
            return {"ok": True, "connected": True, "count": 0,
                    "warning": "Connected, but initial sync failed: " + str(error)}
    except GogError as error:
        return {"ok": False, "reason": str(error)}
    except OSError:
        return {"ok": False, "reason": "Could not securely store GOG credentials."}


def sync(account):
    try:
        return _sync_with_session(account, _active_session(account))
    except GogError as error:
        return {"ok": False, "reason": str(error)}
    except OSError:
        return {"ok": False, "reason": "Could not save the GOG library cache."}


def disconnect(account):
    try:
        folder = _folder(account)
        for filename in ("session.json", "library.json"):
            (folder / filename).unlink(missing_ok=True)
        return {"ok": True}
    except (GogError, OSError):
        return {"ok": False, "reason": "Could not disconnect GOG."}
