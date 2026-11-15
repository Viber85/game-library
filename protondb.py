"""Read-only ProtonDB community compatibility rating for a Steam AppID.

Uses the public ProtonDB summary endpoint. The published community tier
is NOT Valve's Steam Deck Verified label. No rating is not Borked.
"""
import json
import re
import unicodedata
from difflib import SequenceMatcher
from urllib.parse import urlencode
import os
from pathlib import Path
import ssl
import threading
import time
import urllib.error
import urllib.request

URL = "https://www.protondb.com/api/v1/reports/summaries/{}.json"
VALID_TIERS = {"platinum", "gold", "silver", "bronze", "borked"}
MAX_BYTES = 160_000
TIMEOUT_S = 9
HIT_TTL = 7 * 86400
MISS_TTL = 12 * 3600


def _context():
    for filename in ("/etc/ssl/certs/ca-certificates.crt", "/etc/ssl/cert.pem",
                     "/etc/pki/tls/certs/ca-bundle.crt"):
        if os.path.isfile(filename):
            return ssl.create_default_context(cafile=filename)
    return ssl.create_default_context()


def parse_rating(raw):
    if not isinstance(raw, dict):
        return None
    tier = raw.get("tier")
    if not isinstance(tier, str) or tier.lower().strip() not in VALID_TIERS:
        return None
    result = {"tier": tier.lower().strip(), "source": "ProtonDB"}
    return result


def fetch_rating(appid):
    url = URL.format(appid)
    request = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "GameLibrary/0.2 (+https://github.com/Viber85/game-library)",
    })
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_S, context=_context()) as response:
            payload = response.read(MAX_BYTES + 1)
            if len(payload) > MAX_BYTES:
                raise ValueError("ProtonDB response exceeded limit")
            if response.status != 200:
                raise RuntimeError("ProtonDB returned HTTP " + str(response.status))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise
    return parse_rating(json.loads(payload.decode("utf-8")))



# ProtonDB summary data is indexed by Steam AppID, even for games owned on Epic
# or GOG. Resolve only the TITLE through Steam's public catalog; the RATING
# itself is always fetched from ProtonDB, never the Steam Store.
STORE_SEARCH = "https://store.steampowered.com/api/storesearch/"
EDITION_TERMS = re.compile(
    r"\\b(?:deluxe|definitive|ultimate|gold|complete|standard|edition|remastered|"
    r"game of the year|goty)\\b", re.I,
)
NAME_CACHE_TTL = 7 * 86400


def normalize_title(text):
    text = unicodedata.normalize("NFKD", str(text))
    text = text.encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\\s+", " ", text).strip()


def title_match_score(wanted, candidate):
    a = normalize_title(wanted)
    b = normalize_title(candidate)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    clean_a = normalize_title(EDITION_TERMS.sub(" ", wanted))
    clean_b = normalize_title(EDITION_TERMS.sub(" ", candidate))
    return max(SequenceMatcher(None, a, b).ratio() * .96,
               SequenceMatcher(None, clean_a, clean_b).ratio() * .93)


def choose_steam_title(query, items):
    """Only accept a high-confidence title match, not the first result."""
    if not isinstance(items, list):
        return None
    candidates = []
    for raw in items:
        if not isinstance(raw, dict):
            continue
        title, game_id = raw.get("name"), raw.get("id")
        if not isinstance(title, str) or type(game_id) is not int or not 0 < game_id < 2**32:
            continue
        score = title_match_score(query, title)
        if score >= .86:
            candidates.append((score, game_id, title))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    if len(candidates)>1 and candidates[0][0] < .995 and candidates[0][0]-candidates[1][0]<.07:
        # Similarity is ambiguous (often original vs remaster); avoid wrong badges.
        return None
    best=candidates[0]
    return {"appid":best[1], "name":best[2], "confidence":round(best[0],3)}


def fetch_steam_title(query):
    if not isinstance(query, str) or len(query)>140 or len(query)<2:
        return None
    params = urlencode({"term":query, "l":"english", "cc":"us"})
    req = urllib.request.Request(STORE_SEARCH + "?" + params, headers={
        "Accept":"application/json",
        "User-Agent":"GameLibrary/0.2 (+https://github.com/Viber85/game-library)",
    })
    with urllib.request.urlopen(req, timeout=TIMEOUT_S, context=_context()) as resp:
        if getattr(resp, "status", 200) != 200:
            raise RuntimeError("Steam search unavailable")
        data=resp.read(MAX_BYTES+1)
        if len(data)>MAX_BYTES:
            raise ValueError("Steam search response too large")
    decoded=json.loads(data.decode("utf-8"))
    return choose_steam_title(query, decoded.get("items") if isinstance(decoded, dict) else [])


class ProtonDBNameResolver:
    """Cache title->Steam AppID, then query ProtonDB with its actual AppID."""
    def __init__(self, path):
        self.path=Path(path)
        self.lock=threading.Lock()
        self.cache={}
        try:
            loaded=json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                self.cache=loaded
        except (OSError, ValueError):
            pass

    def resolve(self, title):
        if not isinstance(title, str) or len(title)>140 or len(title)<2:
            return None
        if re.search(r"\\.(?:exe|appimage)$",title,re.I):
            return None
        key=normalize_title(title)
        if not key:
            return None
        now=time.time()
        with self.lock:
            prior=self.cache.get(key)
            if isinstance(prior, dict) and 0<=now-(prior.get("time") or 0)<NAME_CACHE_TTL:
                return prior.get("result")
            result=fetch_steam_title(title)
            self.cache[key]={"time":now,"result":result}
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                tmp=self.path.with_suffix(".tmp")
                tmp.write_text(json.dumps(self.cache), encoding="utf-8")
                os.replace(tmp,self.path)
            except OSError:
                pass
            return result

class ProtonDBService:
    def __init__(self, cache_path):
        self.path = Path(cache_path)
        self.lock = threading.Lock()
        self.cache = {}
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                self.cache = data
        except (OSError, ValueError):
            pass

    def get(self, appid):
        if type(appid) is not int or not 0 < appid < 2**32:
            return {"status": "unavailable", "reason": "Steam AppID required", "tier": None}
        key = str(appid)
        now = time.time()
        with self.lock:
            prior = self.cache.get(key)
            if isinstance(prior, dict):
                age = now - (prior.get("time") or 0)
                if 0 <= age < (HIT_TTL if prior.get("value") else MISS_TTL):
                    return {"status": "ok" if prior.get("value") else "unavailable",
                            "tier": (prior.get("value") or {}).get("tier"), "cached": True}
            try:
                rating = fetch_rating(appid)
            except (urllib.error.URLError, OSError, ValueError, TypeError, RuntimeError):
                if isinstance(prior, dict) and prior.get("value"):
                    return {"status": "ok", "tier": prior["value"]["tier"], "cached": True}
                return {"status": "error", "tier": None, "reason": "ProtonDB temporarily unavailable"}
            self.cache[key] = {"time": now, "value": rating}
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                tmp = self.path.with_suffix(".tmp")
                tmp.write_text(json.dumps(self.cache), encoding="utf-8")
                os.replace(tmp, self.path)
            except OSError:
                pass
            return {"status": "ok" if rating else "unavailable",
                    "tier": rating["tier"] if rating else None, "cached": False}
