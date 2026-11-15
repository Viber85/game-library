"""HowLongToBeat read-only lookup for the selected Steam game.

HowLongToBeat has no official public API. This uses the site's search endpoint
with a short-lived search token and caches a per-game result. It does not
request the user's Steam account, inventory, achievements or playtime.
"""
from difflib import SequenceMatcher
import json
import os
from pathlib import Path
import re
import ssl
import threading
import time
import unicodedata
import urllib.error
import urllib.request

HOST = "https://howlongtobeat.com"
SEARCH_PATH = "/api/search/site"
MAX_RESPONSE = 1024 * 1024
HIT_TTL = 7 * 86400
MISS_TTL = 12 * 3600
TIMEOUT = 8
_AGENT = "Mozilla/5.0 (compatible; GameLibrary/0.2; SteamOS)"
_EDITION = re.compile(r"\b(?:deluxe|standard|ultimate|complete|enhanced|definitive|gold|edition|remastered|game of the year|goty)\b", re.I)


def normalized(value):
    value = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]", " ", value.lower())).strip()


def _ssl():
    for bundle in ("/etc/ssl/certs/ca-certificates.crt", "/etc/ssl/cert.pem",
                   "/etc/pki/tls/certs/ca-bundle.crt"):
        if os.path.isfile(bundle):
            return ssl.create_default_context(cafile=bundle)
    return ssl.create_default_context()


def _request(path, body=None, token=None, hp=None):
    headers = {
        "User-Agent": _AGENT, "Accept": "application/json",
        "Origin": HOST, "Referer": HOST + "/",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["x-auth-token"] = token
    if hp:
        headers["x-hp-key"] = hp[0]
        headers["x-hp-val"] = hp[1]
    payload = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        HOST + path, data=payload, headers=headers,
        method="POST" if body is not None else "GET",
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT, context=_ssl()) as response:
        raw = response.read(MAX_RESPONSE + 1)
        if len(raw) > MAX_RESPONSE:
            raise ValueError("HowLongToBeat response too large")
    return json.loads(raw.decode("utf-8"))


def _search(name):
    init = _request(SEARCH_PATH + "/init?t=" + str(int(time.time() * 1000)))
    if not isinstance(init, dict) or not isinstance(init.get("token"), str):
        raise RuntimeError("HowLongToBeat search token unavailable")
    key = next((v for k, v in init.items() if "key" in k.lower() and isinstance(v, str)), "")
    val = next((v for k, v in init.items() if "val" in k.lower() and isinstance(v, str)), "")
    hp = (key, val) if key and val else None
    body = {
        "searchType": "games", "searchTerms": name.split(),
        "searchPage": 1, "size": 20,
        "searchOptions": {
            "games": {
                "userId": 0, "platform": "", "sortCategory": "popular",
                "rangeCategory": "main", "rangeTime": {"min": 0, "max": 0},
                "gameplay": {"perspective": "", "flow": "", "genre": "", "difficulty": ""},
                "rangeYear": {"min": "", "max": ""}, "modifier": "hide_dlc",
            },
            "users": {}, "lists": {}, "filter": "", "sort": 0, "randomizer": 0,
        },
        "useCache": True,
    }
    if hp:
        body[hp[0]] = hp[1]
    data = _request(SEARCH_PATH, body=body, token=init["token"], hp=hp)
    if not isinstance(data, dict) or not isinstance(data.get("data"), list):
        raise RuntimeError("HowLongToBeat search format changed")
    return data["data"]


def _selected_result(query, items):
    wanted = normalized(query)
    simple = normalized(_EDITION.sub("", query))
    best = None
    score = 0
    for raw in items:
        if not isinstance(raw, dict):
            continue
        name = raw.get("game_name")
        if not isinstance(name, str):
            continue
        candidate = normalized(name)
        if not candidate:
            continue
        quality = max(SequenceMatcher(None, wanted, candidate).ratio(),
                      SequenceMatcher(None, simple, candidate).ratio())
        if wanted == candidate or simple == candidate:
            quality = 1.0
        if quality > score:
            score, best = quality, raw
    if best is None or score < 0.78:
        return None

    def hours(key):
        try:
            seconds = float(best.get(key) or 0)
            return round(seconds / 3600, 1) if 0 < seconds < 100000000 else None
        except (TypeError, ValueError):
            return None

    main, extras, complete = hours("comp_main"), hours("comp_plus"), hours("comp_100")
    if all(v is None for v in (main, extras, complete)):
        return None
    game_id = best.get("game_id")
    if not isinstance(game_id, int) or game_id <= 0:
        game_id = None
    return {
        "name": best["game_name"][:150],
        "main": main, "extras": extras, "completionist": complete,
        "url": HOST + "/game/" + str(game_id) if game_id else None,
        "source": "HowLongToBeat",
    }


class HltbService:
    def __init__(self, path):
        self.path = Path(path)
        self._lock = threading.Lock()
        self._cache = {}
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                self._cache = data
        except (OSError, ValueError):
            pass

    def lookup(self, appid, name):
        if type(appid) is not int or appid <= 0 or not isinstance(name, str):
            return {"status": "unavailable", "reason": "Invalid game"}
        name = name.strip()
        if not name or len(name) > 160:
            return {"status": "unavailable", "reason": "Invalid game"}
        if re.search(r"\.(exe|appimage)$", name, re.I):
            return {"status": "unavailable", "reason": "No HLTB game match"}
        key = str(appid)
        now = time.time()
        with self._lock:
            old = self._cache.get(key)
            if isinstance(old, dict) and old.get("query") == name:
                age = now - float(old.get("timestamp") or 0)
                if 0 <= age < (HIT_TTL if old.get("data") else MISS_TTL):
                    return {"status": "ok" if old["data"] else "unavailable",
                            "data": old.get("data"), "cached": True}
            try:
                candidates = _search(name)
                result = _selected_result(name, candidates)
            except (urllib.error.URLError, OSError, ValueError, RuntimeError) as error:
                if isinstance(old, dict) and old.get("data"):
                    return {"status": "ok", "data": old["data"], "cached": True}
                return {"status": "error", "reason": type(error).__name__}
            self._cache[key] = {"query": name, "timestamp": now, "data": result}
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                temp = self.path.with_suffix(".tmp")
                temp.write_text(json.dumps(self._cache), encoding="utf-8")
                os.replace(temp, self.path)
            except OSError:
                pass
            return {"status": "ok" if result else "unavailable", "data": result, "cached": False}
