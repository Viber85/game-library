"""Read-only GOG achievement summary for owned games.

Uses the existing authenticated GOG session. Never invent counts: missing or
incomplete Galaxy API responses are explicitly unavailable, not 0/0.
"""
import re
import threading
import time

_DIGITS = re.compile(r"^[0-9]{1,20}$")
_LOCK = threading.RLock()
_CACHE = {}
_TTL_SECONDS = 300


def _account_user_id(gog, access):
    profile = gog._http_json(gog._PROFILE, access)
    user = str(profile.get("userId", ""))
    if not _DIGITS.fullmatch(user):
        raise ValueError("GOG profile did not provide a valid account ID.")
    return user


def _summary(response):
    if not isinstance(response, dict):
        raise ValueError("Invalid GOG achievement response.")
    items = response.get("items")
    total = response.get("total_count")
    if (not isinstance(items, list) or not isinstance(total, int)
            or isinstance(total, bool) or total < 0 or total > 20000
            or len(items) != total):
        # Some API responses are paginated. We cannot infer an accurate
        # unlocked count from one partial page.
        raise ValueError("GOG achievement list is incomplete.")
    unlocked = 0
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Invalid GOG achievement item.")
        when = item.get("date_unlocked")
        if when is not None and when is not False and when != "":
            unlocked += 1
    if total == 0:
        return {"status": "none", "unlocked": 0, "total": 0}
    return {"status": "available", "unlocked": unlocked, "total": total}


def get_summary(gog, installer, account, product):
    try:
        account, product = installer._account_and_game(gog, account, product)
        key = (account, product)
        with _LOCK:
            entry = _CACHE.get(key)
            if entry and time.monotonic() - entry[0] < _TTL_SECONDS:
                return dict(entry[1])
        session = gog._active_session(account)
        user = _account_user_id(gog, session["access"])
        # The Galaxy API documentation calls this the product ID. Some GOG
        # releases do not have a Galaxy achievements client at this ID.
        url = ("https://gameplay.gog.com/clients/" + product +
               "/users/" + user + "/achievements")
        response = gog._http_json(url, session["access"])
        answer = {"ok": True, **_summary(response)}
        with _LOCK:
            _CACHE[key] = (time.monotonic(), answer)
        return answer
    except ValueError:
        return {"ok": False, "status": "unavailable",
                "reason": "GOG achievement data could not be verified."}
    except Exception as error:
        # A 404 means no available Galaxy achievement list for that ID, not
        # necessarily that the game has exactly zero achievements.
        message = str(error)
        if "HTTP 404" in message:
            return {"ok": True, "status": "unavailable",
                    "reason": "No GOG achievement data for this title."}
        return {"ok": False, "status": "unavailable",
                "reason": "GOG achievements unavailable for this game."}
