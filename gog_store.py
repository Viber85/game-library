"""Read-only GOG Store links for verified owned product IDs.

A GOG numeric product ID is not a Store URL slug. Resolve it using the
official GOG product catalog; do not generate a guessed slug from the title
or accidentally navigate the user to a different game.
"""
import re
import threading
import time

_PRODUCT=re.compile(r"^[0-9]{1,20}$")
_SLUG=re.compile(r"^[a-z0-9][a-z0-9_-]{0,199}$")
_LOCK=threading.RLock()
_CACHE={}
_TTL=6*60*60


def _validated_link(product, data):
    if not isinstance(data, dict) or str(data.get("id", "")) != product:
        return None
    slug=data.get("slug")
    if not isinstance(slug,str) or not _SLUG.fullmatch(slug):
        return None
    # Use the actual catalog slug from the matching numeric GOG Product ID.
    # Never follow untrusted links / redirects returned by other fields.
    return "https://www.gog.com/en/game/"+slug


def lookup(gog, installer, account, product):
    try:
        account,product=installer._account_and_game(gog,account,product)
        if not _PRODUCT.fullmatch(product):
            return {"ok":False,"reason":"Invalid GOG product ID."}
        key=(account,product)
        with _LOCK:
            value=_CACHE.get(key)
            if value and time.monotonic()-value[0]<_TTL:
                return dict(value[1])
        data=gog._http_json(
            "https://api.gog.com/products/"+product+"?locale=en-US")
        url=_validated_link(product,data)
        if not url:
            return {"ok":False,"reason":"No verified GOG Store page for this game."}
        result={"ok":True,"url":url}
        with _LOCK:
            _CACHE[key]=(time.monotonic(),result)
        return result
    except Exception:
        return {"ok":False,"reason":"GOG Store page is currently unavailable."}
