"""GOG Game Library launch registry, safe executable discovery and Steam shortcut setup.

Nothing in this module launches a binary or edits Steam files. Steam shortcuts
are created using the running Steam client's official Apps API by the frontend.
"""
import hashlib
import json
import os
import logging
from pathlib import Path
import re

_APPID_MIN = 0x80000000
_APPID_MAX = 0xffffffff
_TOOL = re.compile(r"^[A-Za-z0-9_.-]{1,100}$")
_LAUNCH_MARKER = ".game-library-gog-launch.json"
_SKIP_DIRS = {"redist", "_redist", "__redist", "redistributables", "directx",
              "_commonredist", "support", "supportfiles", "prerequisites",
              "uninstall", "temp", "cache"}
_BAD_EXE = ("unins", "uninstall", "setup", "dxsetup", "vcredist", "crash",
            "config", "unitycrashhandler", "startmenu", "register", "repair",
            "prereq", "dotnet", "ue4prereq")


def _safe_dir(root, path):
    if root.is_symlink() or path.is_symlink() or not path.is_dir():
        return False
    try:
        real_root = root.resolve(strict=True)
        real_path = path.resolve(strict=True)
        if not real_path.is_relative_to(real_root):
            return False
        cur = path
        while cur != root:
            if cur.is_symlink():
                return False
            cur = cur.parent
        return True
    except (OSError, RuntimeError, ValueError):
        return False


def _installs(installer, account, product):
    """Bounded discovery; only our own completed account/product markers count."""
    result = []
    for location in installer._locations()[:16]:
        root = Path(location["path"])
        if root.is_symlink() or not root.is_dir():
            continue
        candidates = []
        try:
            for child in sorted(root.iterdir(), key=lambda c: c.name)[:100]:
                if child.name != ".game-library-restarts":
                    candidates.append(child)
            restarts = root / ".game-library-restarts" / product
            if not restarts.is_symlink() and restarts.is_dir():
                for attempt in sorted(restarts.iterdir(), key=lambda c: c.name, reverse=True)[:40]:
                    if attempt.is_symlink() or not attempt.is_dir():
                        continue
                    for child in sorted(attempt.iterdir(), key=lambda c: c.name)[:20]:
                        candidates.append(child)
        except OSError:
            continue
        for path in candidates:
            if (not _safe_dir(root, path) or
                    installer._existing_status(path, account, product) != "complete"):
                continue
            result.append(path)
    # Prefer recent completed downloads; preserve deterministic path tie-break.
    return sorted(result, key=lambda p: (p.stat().st_mtime, str(p)), reverse=True)[:10]


def _files(root):
    """Enumerate limited game executables without following symbolic links."""
    if not root.is_dir() or root.is_symlink():
        return []
    result = []
    visited = 0
    for folder, dirs, files in os.walk(root, followlinks=False):
        here = Path(folder)
        depth = len(here.relative_to(root).parts)
        if depth > 5:
            dirs.clear()
            continue
        dirs[:] = [d for d in dirs if d.lower() not in _SKIP_DIRS and
                   not (here / d).is_symlink()]
        for name in files:
            visited += 1
            if visited > 3500 or len(result) >= 60:
                return result
            if not name.lower().endswith(".exe"):
                continue
            path = here / name
            if path.is_symlink() or not path.is_file():
                continue
            try:
                if path.stat().st_size == 0:
                    continue
            except OSError:
                continue
            rel = path.relative_to(root).as_posix()
            low = name.lower()
            skip = any(term in low for term in _BAD_EXE)
            score = (0 if skip else 100) - depth * 5
            if "shipping" in low or "win64" in low:
                score += 15
            if depth == 0:
                score += 15
            result.append({"relative": rel, "label": rel, "recommended": not skip,
                           "score": score})
    return sorted(result, key=lambda d: (-d["score"], d["relative"].lower()))


def _registry_path(installer, root, account, product):
    """Use a private per-user registry instead of writing into a GOG game
    directory, which may be on an SD/external filesystem."""
    home, user = installer._home()
    account_hash = hashlib.sha256(account.encode("ascii")).hexdigest()[:24]
    game_hash = hashlib.sha256(str(root.resolve(strict=True)).encode("utf-8")).hexdigest()[:24]
    return (home / ".local" / "share" / "game-library" / "gog-launch" /
            account_hash / product / (game_hash + ".json")), home, user


def _ensure_registry_parent(parent, home, user):
    """Create private plugin-owned paths without traversing symlinks."""
    if not parent.is_relative_to(home) or parent == home or home.is_symlink():
        raise ValueError("Unsafe Game Library launch storage path.")
    if not home.is_dir():
        raise ValueError("Steam user home is unavailable.")
    current = parent
    missing = []
    while current != home:
        if current.is_symlink() or (current.exists() and not current.is_dir()):
            raise ValueError("Unsafe Game Library launch storage directory.")
        if not current.exists():
            missing.append(current)
        current = current.parent
    for node in reversed(missing):
        node.mkdir(mode=0o700)
        if os.geteuid() == 0:
            os.chown(node, user.pw_uid, user.pw_gid)
    # Limit repairs to the plugin-owned registry, not other user folders.
    plugin_dir = home / ".local" / "share" / "game-library" / "gog-launch"
    for node in (plugin_dir, plugin_dir.parent):
        if node.is_dir() and not node.is_symlink():
            # Existing paths might have been created by root Decky services.
            if os.geteuid() == 0 and node.stat().st_uid == 0:
                try:
                    os.chown(node, user.pw_uid, user.pw_gid)
                except OSError:
                    pass
    for node in (plugin_dir, plugin_dir / parent.relative_to(plugin_dir).parts[0],
                 parent):
        try:
            os.chmod(node, 0o700)
        except OSError:
            pass


def _read_launch(installer, root, account, product, candidates):
    # Read the new registry first, then allow an old in-game marker.
    try:
        registry_path, _, _ = _registry_path(installer, root, account, product)
        paths = (registry_path, root / _LAUNCH_MARKER)
    except (OSError, ValueError, RuntimeError):
        paths = (root / _LAUNCH_MARKER,)
    for path in paths:
        if path.is_symlink() or not path.is_file():
            continue
        try:
            if path.stat().st_size > 4096:
                continue
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            continue
        if (data.get("product") != product or
                data.get("account") != hashlib.sha256(account.encode("ascii")).hexdigest()[:24] or
                not isinstance(data.get("app_id"), int) or isinstance(data.get("app_id"), bool) or
                not _APPID_MIN <= data["app_id"] <= _APPID_MAX or
                data.get("relative") not in (x["relative"] for x in candidates)):
            continue
        tool = data.get("tool")
        ready = isinstance(tool, str) and bool(_TOOL.fullmatch(tool)) and "proton" in tool.lower()
        return {"app_id": data["app_id"], "relative": data["relative"],
                "tool": tool if ready else None, "ready": ready}
    return None


def _inspect(installer, gog, account, product):
    account, product = installer._account_and_game(gog, account, product)
    completed = _installs(installer, account, product)
    if not completed:
        return {"ok": True, "status": "not-installed", "candidates": []}
    path = completed[0]
    candidates = _files(path)
    shortcut = _read_launch(installer, path, account, product, candidates)
    return {"ok": True, "status": "ready" if shortcut and shortcut["ready"] else
            "registered" if shortcut else "downloaded",
            "install_dir": str(path), "candidates": candidates[:35],
            "shortcut": shortcut}


def inspect(installer, gog, account, product):
    try:
        return _inspect(installer, gog, account, product)
    except ValueError as e:
        return {"ok": False, "reason": str(e)}
    except Exception:
        return {"ok": False, "reason": "Could not inspect completed GOG games."}


def _write_launch(installer, install_dir, account, product, payload):
    """Atomic private metadata write. Never require SD game-folder writes."""
    path, home, user = _registry_path(installer, Path(install_dir), account, product)
    _ensure_registry_parent(path.parent, home, user)
    if path.is_symlink():
        raise ValueError("Unsafe GOG shortcut metadata path.")
    temp = path.with_suffix(".tmp")
    if temp.is_symlink():
        raise ValueError("Unsafe GOG shortcut metadata path.")
    with temp.open("w", encoding="utf-8") as fh:
        os.fchmod(fh.fileno(), 0o600)
        json.dump(payload, fh)
    if os.geteuid() == 0:
        os.chown(temp, user.pw_uid, user.pw_gid)
    temp.replace(path)


def register(installer, gog, account, product, install_dir, relative, app_id):
    """Record only a verified Game Library install and Steam shortcut app ID."""
    try:
        state = _inspect(installer, gog, account, product)
        if not state.get("ok") or state.get("status") == "not-installed":
            raise ValueError("This game has no completed Game Library installation.")
        # Never let the frontend supply an arbitrary path or executable.
        if state["install_dir"] != install_dir:
            raise ValueError("Unknown completed GOG install location.")
        if relative not in [x["relative"] for x in state["candidates"]]:
            raise ValueError("Select a verified game executable.")
        if type(app_id) is not int or not _APPID_MIN <= app_id <= _APPID_MAX:
            raise ValueError("Steam returned an invalid shortcut ID.")
        old = state.get("shortcut")
        if old:
            if old["app_id"] != app_id or old["relative"] != relative:
                raise ValueError("A Steam shortcut is already recorded for this installation.")
            return {"ok": True, "app_id": app_id, "ready": old["ready"]}
        account = installer._account(account)
        payload = {"account": hashlib.sha256(account.encode("ascii")).hexdigest()[:24],
                   "product": product, "relative": relative, "app_id": app_id,
                   "tool": None}
        _write_launch(installer, install_dir, account, product, payload)
        return {"ok": True, "app_id": app_id, "ready": False}
    except ValueError as e:
        return {"ok": False, "reason": str(e)}
    except OSError as e:
        logging.warning("GOG shortcut registry write failed, errno=%s", e.errno)
        return {"ok": False, "reason": "GOG shortcut metadata could not be saved (OS error %s)." % (e.errno or "unknown")}
    except Exception:
        logging.exception("Unexpected GOG shortcut registration failure")
        return {"ok": False, "reason": "GOG shortcut registration failed (backend error; check Decky log)."}


def finalize(installer, gog, account, product, app_id, tool):
    try:
        state = _inspect(installer, gog, account, product)
        shortcut = state.get("shortcut")
        if not state.get("ok") or not shortcut or shortcut["app_id"] != app_id:
            raise ValueError("The GOG Steam shortcut is not registered.")
        if not isinstance(tool, str) or not _TOOL.fullmatch(tool) or "proton" not in tool.lower():
            raise ValueError("Select a Steam-available Proton compatibility tool.")
        payload = {"account": hashlib.sha256(account.encode("ascii")).hexdigest()[:24],
                   "product": product, "relative": shortcut["relative"],
                   "app_id": app_id, "tool": tool}
        _write_launch(installer, state["install_dir"], account, product, payload)
        return {"ok": True}
    except ValueError as e:
        return {"ok": False, "reason": str(e)}
    except OSError as e:
        logging.warning("GOG Proton marker write failed, errno=%s", e.errno)
        return {"ok": False, "reason": "GOG Proton settings could not be saved (OS error %s)." % (e.errno or "unknown")}
    except Exception:
        logging.exception("Unexpected GOG launch finalization failure")
        return {"ok": False, "reason": "GOG Proton configuration failed (backend error; check Decky log)."}
