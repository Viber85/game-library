"""Read-only Steam install size metadata for Game Library.

Installed games use Steam's native size_on_disk in the frontend. This module
only estimates *uninstalled* game disk requirements from publicly available
Steam Store PC requirements. It does not inspect or download depots, launch
Steam installs, authenticate, or claim exact download/install sizes.
"""
import html
import json
import os
import pathlib
import re
import threading
import time
import urllib.error
import urllib.request

POSITIVE_TTL = 30 * 86400
NEGATIVE_TTL = 24 * 3600
ERROR_TTL = 10 * 60
MAX_BYTES = 2_000_000
MIN_REQUEST_INTERVAL = 3.0

_STORAGE_ROW = re.compile(
    r"(?:^|[\n;])\s*(?:storage|hard\s+drive|disk\s+space|hard\s+disk\s+space)"
    r"\s*:?\s*(.{0,110})", re.I)
_AMOUNT = re.compile(
    r"\b(\d{1,5}(?:[.,]\d{1,2})?)\s*(TiB|GiB|MiB|TB|GB|MB)\b", re.I)
_TAGS = re.compile(r"<[^>]{0,500}>")


def parse_required_gb(requirements):
    """Read the labeled minimum Storage row only, never RAM, VRAM or disk art.

    Store values are requirements, not verified installed bytes. Return GB
    with decimal units in the source as an estimate for display.
    """
    if not isinstance(requirements, str) or len(requirements) > 80_000:
        return None
    text = html.unescape(requirements)
    text = re.sub(r"(?i)<\s*br\s*/?\s*>|</(?:li|p|div|ul)>", "\n", text)
    text = _TAGS.sub(" ", text).replace("\xa0", " ")
    for line in text.splitlines():
        match = _STORAGE_ROW.search(line)
        if not match:
            continue
        found = _AMOUNT.search(match.group(1))
        if not found:
            continue
        try:
            number = float(found.group(1).replace(",", "."))
        except ValueError:
            continue
        unit = found.group(2).upper()
        factor = {"MB": .001, "MIB": 1024 / 1_000_000,
                  "GB": 1, "GIB": 1024**3 / 1_000_000_000,
                  "TB": 1000, "TIB": 1024**4 / 1_000_000_000}[unit]
        value = number * factor
        if .05 <= value <= 3000:
            return round(value, 2)
    return None


def parse_store_response(payload, appid):
    """Return conservative estimate, preserving platform and requirement type."""
    if not isinstance(payload, dict):
        return None
    item = payload.get(str(appid))
    if not isinstance(item, dict) or item.get("success") is not True:
        return None
    data = item.get("data")
    if not isinstance(data, dict):
        return None
    # On SteamOS Windows build via Proton is the primary relevant estimate.
    for platform in ("pc", "linux"):
        req = data.get(platform + "_requirements")
        if not isinstance(req, dict):
            continue
        for category in ("minimum", "recommended"):
            gb = parse_required_gb(req.get(category))
            if gb is not None:
                name = data.get("name")
                title = name.strip() if isinstance(name, str) else ""
                return {"status": "estimated", "estimated_gb": gb,
                        "platform": platform, "requirement": category,
                        "source": "steam_store",
                        "steam_title": title[:180] if 0 < len(title) <= 200 else ""}
    return None


def fetch_store_requirements(appid):
    """Fixed Steam-owned HTTPS endpoint; no user-supplied URL or credentials."""
    if type(appid) is not int or not 1 <= appid <= 0xFFFFFFFF:
        raise ValueError("Invalid Steam AppID")
    url = ("https://store.steampowered.com/api/appdetails?"
           f"appids={appid}&filters=basic&l=english&cc=us")
    request = urllib.request.Request(
        url, headers={"User-Agent": "GameLibraryDecky/0.5 (public metadata)",
                      "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=7) as response:
        content = response.read(MAX_BYTES + 1)
        if len(content) > MAX_BYTES:
            raise ValueError("Store response exceeds allowed size")
    return json.loads(content.decode("utf-8"))


class SteamSizeService:
    """Persist estimates, cache negative responses, and throttle Store calls.

    A lock prevents accidental simultaneous Store lookups; the caller
    receives a cheap 'deferred' reply during the cooldown, not a queue of
    hundreds of requests that outlive the focused game.
    """

    def __init__(self, cache_path):
        self.path = pathlib.Path(cache_path)
        self.lock = threading.RLock()
        self.next_allowed = 0.0
        self.entries = self._read_cache()

    def _read_cache(self):
        try:
            if self.path.stat().st_size > 1_000_000:
                return {}
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            items = raw.get("entries", {})
            return items if isinstance(items, dict) else {}
        except (OSError, ValueError, TypeError, AttributeError):
            return {}

    def _write_cache(self):
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps({"entries": self.entries}),
                           encoding="utf-8")
            os.replace(tmp, self.path)
        except OSError:
            pass  # Cache failure must never break Library navigation.

    def _cached(self, appid, now):
        value = self.entries.get(str(appid))
        if not isinstance(value, dict) or not isinstance(value.get("until"), (int, float)):
            return None
        if value["until"] <= now:
            return None
        reply = value.get("reply")
        if not isinstance(reply, dict):
            return None
        # 0.6.8 includes Steam's official product name. Legacy positive
        # entries lack it, so refetch ONLY on selection to validate cross-
        # storefront comparisons rather than accepting a stale unknown title.
        if reply.get("status") == "estimated" and not reply.get("steam_title"):
            return None
        return {**reply, "cached": True}

    def lookup(self, appid):
        if type(appid) is not int or not 1 <= appid <= 0xFFFFFFFF:
            return {"status": "invalid"}
        with self.lock:
            now = time.time()
            hit = self._cached(appid, now)
            if hit is not None:
                return hit
            wait = self.next_allowed - time.monotonic()
            if wait > 0:
                return {"status": "deferred", "retry_after": round(wait + .2, 2)}
            # Claim the next slot BEFORE attempting network I/O.
            self.next_allowed = time.monotonic() + MIN_REQUEST_INTERVAL
            try:
                result = parse_store_response(fetch_store_requirements(appid), appid)
                reply = result or {"status": "unavailable"}
                ttl = POSITIVE_TTL if result else NEGATIVE_TTL
            except urllib.error.HTTPError as error:
                # An undocumented Store endpoint may limit requests by IP.
                # 429/403 pause further lookups instead of retrying rapidly.
                if error.code in (429, 403):
                    raw = error.headers.get("Retry-After") if error.headers else None
                    cooldown = int(raw) if raw and raw.isdecimal() else 3600
                    cooldown = min(max(300, cooldown), 86400)
                    self.next_allowed = time.monotonic() + cooldown
                    reply, ttl = {"status": "rate_limited"}, cooldown
                else:
                    reply, ttl = {"status": "error"}, ERROR_TTL
            except (OSError, ValueError, UnicodeError, TimeoutError, TypeError):
                reply, ttl = {"status": "error"}, ERROR_TTL
            self.entries[str(appid)] = {"until": time.time() + ttl, "reply": reply}
            if len(self.entries) > 3000:
                self.entries = dict(sorted(self.entries.items(),
                    key=lambda item: item[1].get("until", 0), reverse=True)[:2500])
            self._write_cache()
            return {**reply, "cached": False}

    def cached_bulk(self, appids):
        if not isinstance(appids, list) or len(appids) > 1000:
            return {"entries": []}
        now = time.time()
        with self.lock:
            entries = [
                {"appid": appid, **hit}
                for appid in appids
                if type(appid) is int and 0 < appid <= 0xFFFFFFFF
                if (hit := self._cached(appid, now)) is not None
            ]
        return {"entries": entries}
