"""Optional SteamGridDB v2 artwork fallback for missing Steam game images.

Only HTTP GETs to SteamGridDB's verified API endpoints are made. The user's
private key is sent in the Authorization header and is never returned to CEF.
Title matching is deliberately strict to avoid incorrect cover assignments.
"""
import json
import os
import pathlib
import re
import tempfile
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

API_BASE = "https://www.steamgriddb.com/api/v2/"
POSITIVE_TTL = 30 * 86400
NEGATIVE_TTL = 86400
MAX_CACHE_ENTRIES = 1500


def normalize_title(title):
    if not isinstance(title, str):
        return ""
    # Remove symbols before NFKC, which otherwise expands ™ into the text TM.
    value = re.sub(r"[™®©]", "", title)
    value = unicodedata.normalize("NFKC", value).casefold()
    return re.sub(r"[^a-z0-9]+", "", value)


def valid_key(value):
    return isinstance(value, str) and bool(re.fullmatch(r"[A-Za-z0-9_-]{20,128}", value))


def valid_art_url(value):
    if not isinstance(value, str) or len(value) > 2048:
        return None
    try:
        parsed = urllib.parse.urlsplit(value)
        host = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or parsed.username or parsed.password:
            return None
        if host != "steamgriddb.com" and not host.endswith(".steamgriddb.com"):
            return None
        if parsed.port not in (None, 443):
            return None
        if not parsed.path or parsed.path == "/":
            return None
        return value
    except ValueError:
        return None


def choose_game(title, response):
    """Never use a loose autocomplete result for the wrong game or sequel."""
    target = normalize_title(title)
    if len(target) < 2 or not isinstance(response, dict):
        return None
    matches = [
        item for item in response.get("data", [])[:12]
        if isinstance(item, dict) and normalize_title(item.get("name")) == target
        and type(item.get("id")) is int and item["id"] > 0
    ] if isinstance(response.get("data"), list) else []
    if not matches:
        return None
    matches.sort(key=lambda x: not bool(x.get("verified")))
    return matches[0]["id"]


def choose_art(response, kind):
    if kind not in ("cover", "hero") or not isinstance(response, dict):
        return None
    rows = response.get("data", [])
    if not isinstance(rows, list):
        return None
    target = 600 / 900 if kind == "cover" else 1920 / 620
    options = []
    for item in rows[:80]:
        if not isinstance(item, dict):
            continue
        if any(item.get(flag) is True for flag in ("nsfw", "humor", "epilepsy")):
            continue
        if item.get("mime") == "image/gif":
            continue
        url = valid_art_url(item.get("url"))
        if not url:
            continue
        w, h = item.get("width"), item.get("height")
        if type(w) is not int or type(h) is not int or h <= 0 or w <= 0:
            continue
        ratio = w / h
        if kind == "cover" and not (0.50 <= ratio <= 0.85):
            continue
        if kind == "hero" and not (2.3 <= ratio <= 3.9):
            continue
        # Prefer close target aspect and highly upvoted images.
        votes = max(-100, min(10000, int(item.get("upvotes") or 0) -
                               int(item.get("downvotes") or 0)))
        score = -abs(ratio - target) * 200 + min(80, votes / 10)
        options.append((score, url))
    return max(options, default=(0, None))[1]


def fetch_json(endpoint, api_key):
    """Strict HTTPS API read, with capped reply and no redirects to other hosts."""
    url = API_BASE + endpoint
    request = urllib.request.Request(url, headers={
        "Authorization": "Bearer " + api_key,
        "Accept": "application/json",
        "User-Agent": "GameLibrary-SteamOS/0.5",
    })
    # A third-party redirect must never receive the bearer key.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    opener = urllib.request.build_opener(NoRedirect)
    with opener.open(request, timeout=8) as reply:
        if urllib.parse.urlsplit(reply.geturl()).hostname != "www.steamgriddb.com":
            raise ValueError("Unexpected provider redirect")
        data = reply.read(2_000_001)
        if len(data) > 2_000_000:
            raise ValueError("Provider response too large")
        return json.loads(data.decode("utf-8"))


def verify_key(api_key):
    """Only persist credentials accepted by the SteamGridDB API itself."""
    if not valid_key(api_key):
        return False
    try:
        response = fetch_json("search/autocomplete/Portal", api_key)
        return isinstance(response, dict) and response.get("success") is True
    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            return False
        raise


def key_path(settings_dir):
    return pathlib.Path(settings_dir) / "steamgriddb.key"


def read_key(settings_dir):
    path = key_path(settings_dir)
    try:
        if path.is_symlink() or not path.is_file() or path.stat().st_size > 256:
            return None
        token = path.read_text(encoding="utf-8").strip()
        return token if valid_key(token) else None
    except (OSError, UnicodeError):
        return None


def save_key(settings_dir, token):
    if not valid_key(token):
        return False
    path = key_path(settings_dir)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        # Named secure file prevents the key being written with default 0644.
        fd, temp_path = tempfile.mkstemp(prefix=".sgdb-", dir=path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(token + "\n")
            os.chmod(temp_path, 0o600)
            os.replace(temp_path, path)
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
        return True
    except OSError:
        return False


def delete_key(settings_dir):
    path = key_path(settings_dir)
    try:
        if path.is_symlink():
            return False
        path.unlink(missing_ok=True)
        return True
    except OSError:
        return False


class ArtworkService:
    def __init__(self, cache_path):
        self.path = pathlib.Path(cache_path)
        self.lock = threading.Lock()
        self.entries = {}
        self._load()

    def _load(self):
        try:
            if self.path.is_symlink() or self.path.stat().st_size > 2_000_000:
                return
            value = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(value, dict) and isinstance(value.get("entries"), dict):
                self.entries = dict(list(value["entries"].items())[:MAX_CACHE_ENTRIES])
        except (OSError, ValueError, TypeError):
            pass

    def _save(self):
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            recent = sorted(self.entries.items(),
                            key=lambda entry: entry[1].get("at", 0)
                            if isinstance(entry[1], dict) else 0, reverse=True)[:MAX_CACHE_ENTRIES]
            data = json.dumps({"entries": dict(recent)}, separators=(",", ":"))
            fd, name = tempfile.mkstemp(prefix=".sgdb-cache-", dir=self.path.parent)
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    f.write(data)
                os.replace(name, self.path)
            finally:
                if os.path.exists(name):
                    os.unlink(name)
        except (OSError, TypeError, ValueError):
            pass

    def lookup(self, title, api_key):
        normalized = normalize_title(title)
        if not valid_key(api_key) or len(normalized) < 2 or len(normalized) > 180:
            return {"status": "invalid", "cover": None, "hero": None}
        with self.lock:
            now = time.time()
            record = self.entries.get(normalized)
            if isinstance(record, dict):
                ttl = POSITIVE_TTL if record.get("status") == "ok" else NEGATIVE_TTL
                if now - float(record.get("at", 0)) < ttl:
                    return {"status": record.get("status", "unavailable"),
                            "cover": valid_art_url(record.get("cover")),
                            "hero": valid_art_url(record.get("hero")),
                            "cached": True}
            try:
                response = fetch_json("search/autocomplete/" +
                    urllib.parse.quote(title.strip(), safe=""), api_key)
                game_id = choose_game(title, response)
                if game_id is None:
                    result = {"status": "no_match", "cover": None, "hero": None}
                else:
                    # SteamGridDB's published portrait and hero dimensions.
                    # Without filters, a page can be dominated by wide grids.
                    grids = fetch_json("grids/game/" + str(game_id) +
                        "?dimensions=600x900,342x482,660x930&types=static&nsfw=false&humor=false&epilepsy=false", api_key)
                    heroes = fetch_json("heroes/game/" + str(game_id) +
                        "?dimensions=1920x620,1600x650,3840x1240&types=static&nsfw=false&humor=false&epilepsy=false", api_key)
                    cover = choose_art(grids, "cover")
                    hero = choose_art(heroes, "hero")
                    result = {"status": "ok" if cover or hero else "unavailable",
                              "cover": cover, "hero": hero}
            except urllib.error.HTTPError as error:
                return {"status": "unauthorized" if error.code in (401, 403) else "error",
                        "cover": None, "hero": None}
            except (OSError, TimeoutError, ValueError, TypeError, KeyError):
                return {"status": "error", "cover": None, "hero": None}
            self.entries[normalized] = {**result, "at": now}
            self._save()
            return {**result, "cached": False}
