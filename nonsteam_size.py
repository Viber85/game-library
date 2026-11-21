"""Read-only local sizes for Steam non-Steam shortcuts.

Steam's binary shortcuts.vdf identifies the exact executable/Flatpak app ID.
No shell scripts, installs, downloads or directory crawls are executed.
An AppImage result is the image file size; a Flatpak result is the app's
installed size (excluding shared runtimes and user data).
"""
import os
import pathlib
import re
import shlex
import shutil
import struct
import subprocess
import threading
import time

APPID_MAX = 0xFFFFFFFF
MAX_VDF = 4_000_000
SIZE_MAX = 3_000_000_000_000
FLATPAK_ID = re.compile(r"^[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*){1,12}$")
SIZE_TEXT = re.compile(r"^\s*(\d+(?:[.,]\d+)?)\s*(B|bytes?|KB|KiB|MB|MiB|GB|GiB|TB|TiB)?\s*$", re.I)


def parse_binary_shortcuts(blob):
    """Decode bounded Steam KeyValues1 used by shortcuts.vdf, fail closed."""
    if not isinstance(blob, bytes) or len(blob) > MAX_VDF:
        return []
    p = 0

    def cstring():
        nonlocal p
        end = blob.find(b"\x00", p, min(len(blob), p + 4097))
        if end < 0:
            raise ValueError("Malformed VDF string")
        value = blob[p:end].decode("utf-8", errors="replace")
        p = end + 1
        return value

    def fields(depth):
        nonlocal p
        if depth > 12:
            raise ValueError("Excessive VDF nesting")
        result = {}
        while p < len(blob):
            kind = blob[p]
            p += 1
            if kind in (8, 11):
                return result
            name = cstring().lower()
            if kind == 0:
                val = fields(depth + 1)
            elif kind == 1:
                val = cstring()
            elif kind in (2, 3, 4, 6):
                if p + 4 > len(blob):
                    raise ValueError("Truncated VDF value")
                val = struct.unpack_from("<I", blob, p)[0] if kind == 2 else None
                p += 4
            elif kind in (7, 10):
                if p + 8 > len(blob):
                    raise ValueError("Truncated VDF value")
                p += 8
                val = None
            elif kind == 9:
                if p + 4 > len(blob):
                    raise ValueError("Truncated binary length")
                length = struct.unpack_from("<I", blob, p)[0]
                p += 4
                if length > MAX_VDF or p + length > len(blob):
                    raise ValueError("Oversized binary VDF value")
                p += length
                val = None
            else:
                raise ValueError("Unsupported VDF field")
            if name in ("shortcuts", "appid", "appname", "exe",
                        "launchoptions", "startdir") or name.isdecimal():
                result[name] = val
        return result

    try:
        document = fields(0)
        entries = document.get("shortcuts")
        if not isinstance(entries, dict):
            return []
        return [
            entry for key, entry in entries.items()
            if key.isdecimal() and isinstance(entry, dict)
            and type(entry.get("appid")) is int
            and isinstance(entry.get("appname"), str)
            and isinstance(entry.get("exe"), str)
        ][:5000]
    except (ValueError, OverflowError):
        return []


def shortcut_path(account_id):
    """Find ONLY the current user's Steam shortcut file, never search the disk."""
    home = pathlib.Path.home()
    roots = [home / ".local/share/Steam/userdata", home / ".steam/steam/userdata"]
    candidates = []
    if isinstance(account_id, str) and re.fullmatch(r"[0-9]{1,12}", account_id):
        user = str(int(account_id))
        candidates = [root / user / "config/shortcuts.vdf" for root in roots]
    elif account_id == "":
        # If Steam client has not supplied a user yet, use a fallback only
        # when exactly one shortcuts.vdf is present in Steam's user folders.
        for root in roots:
            try:
                candidates.extend(root.glob("[0-9]*/config/shortcuts.vdf"))
            except OSError:
                continue
        candidates = sorted(set(str(p.resolve()) for p in candidates))
        if len(candidates) != 1:
            return None
    else:
        return None
    for candidate in candidates:
        try:
            p = pathlib.Path(candidate)
            if p.is_file() and p.stat().st_size <= MAX_VDF:
                return p
        except OSError:
            continue
    return None


def matching_shortcut(appid, title, account_id):
    if type(appid) is not int or not (0 < appid <= APPID_MAX):
        return None
    if not isinstance(title, str) or not (0 < len(title) <= 250):
        return None
    path = shortcut_path(account_id)
    if path is None:
        return None
    try:
        entries = parse_binary_shortcuts(path.read_bytes())
    except OSError:
        return None
    # A shortcut's assigned ID, not a guessed Store AppID/title match.
    match = [s for s in entries if s.get("appid") == appid and
             s.get("appname", "").strip().casefold() == title.strip().casefold()]
    return match[0] if len(match) == 1 else None


def command_tokens(shortcut):
    pieces = []
    for key in ("exe", "launchoptions"):
        value = shortcut.get(key, "")
        if not isinstance(value, str) or len(value) > 2048:
            return []
        try:
            pieces.extend(shlex.split(value))
        except ValueError:
            return []
    return pieces[:80]


def flatpak_id(tokens):
    if not tokens:
        return None
    exe = pathlib.Path(tokens[0]).name.lower()
    # Steam sometimes points directly at a Flatpak exported wrapper binary.
    if len(tokens) == 1 and "/flatpak/exports/bin/" in tokens[0]:
        app = pathlib.Path(tokens[0]).name
        return app if FLATPAK_ID.fullmatch(app) else None
    if exe not in ("flatpak", "flatpak-spawn"):
        return None
    if exe == "flatpak-spawn":
        try:
            at = tokens.index("flatpak", 1)
            tokens = tokens[at:]
        except ValueError:
            return None
    # Only an explicit 'run' launch denotes a Flatpak application.
    try:
        at = tokens.index("run", 1)
    except ValueError:
        return None
    # Trailing args after AppID are command arguments; the first valid
    # ID token after 'run' is the application name.
    for token in tokens[at + 1:]:
        if token == "--":
            continue
        if token.startswith("-") or token.startswith("%"):
            continue
        return token if FLATPAK_ID.fullmatch(token) else None
    return None


def appimage_file(tokens):
    if not tokens:
        return None
    # Do not follow arbitrary shell wrapper scripts or attempt to resolve
    # relative paths whose working directory might be ambiguous.
    raw = tokens[0].strip()
    if raw.startswith("$HOME/"):
        raw = str(pathlib.Path.home()) + raw[5:]
    if raw.startswith("~/"):
        raw = str(pathlib.Path.home()) + raw[1:]
    if not raw.lower().endswith(".appimage") or not raw.startswith("/"):
        return None
    path = pathlib.Path(raw)
    try:
        if path.is_file():
            size = path.stat().st_size
            return size if 0 < size <= SIZE_MAX else None
    except OSError:
        pass
    return None


def parse_flatpak_size(output):
    if not isinstance(output, str):
        return None
    m = SIZE_TEXT.fullmatch(output.strip())
    if not m:
        return None
    value = float(m.group(1).replace(",", "."))
    unit = (m.group(2) or "").lower()
    multiplier = {
        "": 1, "b": 1, "byte": 1, "bytes": 1,
        "kb": 1000, "kib": 1024,
        "mb": 1000**2, "mib": 1024**2,
        "gb": 1000**3, "gib": 1024**3,
        "tb": 1000**4, "tib": 1024**4,
    }.get(unit)
    if multiplier is None:
        return None
    size = round(value * multiplier)
    return size if 0 < size <= SIZE_MAX else None


def flatpak_installed_bytes(app):
    if not FLATPAK_ID.fullmatch(app):
        return None
    binary = shutil.which("flatpak")
    if not binary:
        return None
    for scope in ("--user", "--system"):
        try:
            done = subprocess.run(
                [binary, "info", scope, "--app", "--show-size", app],
                shell=False, capture_output=True, text=True, timeout=5, check=False)
        except (OSError, subprocess.TimeoutExpired):
            continue
        if done.returncode == 0:
            size = parse_flatpak_size(done.stdout)
            if size is not None:
                return size
    return None


class NonSteamSizeService:
    """Local-only TTL cache. Never start Flatpak installations or scan folders."""
    def __init__(self):
        self.lock = threading.Lock()
        self.cache = {}

    def lookup(self, appid, title, account_id=""):
        if (type(appid) is not int or not 0 < appid <= APPID_MAX or
            not isinstance(title, str) or not 0 < len(title) <= 250 or
            not isinstance(account_id, str) or
            (account_id != "" and not re.fullmatch(r"[0-9]{1,12}", account_id))):
            return {"status": "invalid"}
        key = (account_id, appid, title)
        with self.lock:
            now = time.monotonic()
            hit = self.cache.get(key)
            if hit and hit[0] > now:
                return dict(hit[1])
            shortcut = matching_shortcut(appid, title, account_id)
            result = {"status": "unavailable"}
            if shortcut:
                tokens = command_tokens(shortcut)
                app = flatpak_id(tokens)
                if app is not None:
                    size = flatpak_installed_bytes(app)
                    if size is not None:
                        result = {"status": "ok", "source": "flatpak",
                                  "size_bytes": size}
                else:
                    size = appimage_file(tokens)
                    if size is not None:
                        result = {"status": "ok", "source": "appimage",
                                  "size_bytes": size}
            # Local executables can be replaced. Keep positive results
            # for only 15 minutes, and misses for 2 minutes.
            ttl = 900 if result["status"] == "ok" else 120
            if len(self.cache) > 1200:
                self.cache.clear()
            self.cache[key] = (now + ttl, result)
            return dict(result)
