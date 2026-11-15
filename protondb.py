"""Read-only ProtonDB community compatibility rating for a Steam AppID.

Uses the public ProtonDB summary endpoint. The published community tier
is NOT Valve's Steam Deck Verified label. No rating is not Borked.
"""
import json
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
