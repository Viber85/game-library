"""Game Library's account-scoped, read-only GOG preflight and download supervisor.

Uses the separately licensed official gogdl zipapp (pinned in package.sh). It
never touches other launchers' credentials/installs and never deletes files.
Windows downloads are deliberately NOT marked playable before Proton support.
"""
import hashlib
import json
import os
import pathlib
import pwd
import re
import signal
import subprocess
import threading
import time

_PRODUCT = re.compile(r"^[0-9]{1,20}$")
_DIR_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 _().-]{0,127}$")
_PROGRESS = re.compile(r"= Progress:\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+)/([0-9]+)")
_RATE = re.compile(r"\+\s+Download\s+-\s+([0-9]+(?:\.[0-9]+)?)\s+MiB/s")
_PINNED_HASH = "2aa2b59c83d3bfbe7b60ead91c6297b263b5d1e6c233a04b7409bafe26738f02"
_LOCK = threading.RLock()
_JOBS = {}
_STATES = {}


def _account_and_game(gog, account, product):
    account = gog._account(account)
    if not isinstance(product, str) or not _PRODUCT.fullmatch(product):
        raise ValueError("Invalid GOG product.")
    catalog = gog.library(account)
    if not catalog.get("ok") or not any(
        x.get("id") == product for x in catalog.get("games", [])
        if isinstance(x, dict)
    ):
        raise ValueError("Game is not in the connected GOG library.")
    return account, product


def _home():
    """Resolve the actual Steam user's home, never an arbitrary frontend path."""
    if os.geteuid() == 0:
        for candidate in ("deck", "gamer"):
            try:
                user = pwd.getpwnam(candidate)
            except KeyError:
                continue
            if pathlib.Path(user.pw_dir).is_dir():
                return pathlib.Path(user.pw_dir), user
    if os.geteuid() == 0:
        for entry in sorted(pathlib.Path("/home").iterdir()):
            try:
                user = pwd.getpwnam(entry.name)
            except KeyError:
                continue
            if entry.is_dir() and not entry.is_symlink() and (
                    (entry / ".steam").exists() or (entry / ".local/share/Steam").exists()):
                return entry, user
        raise ValueError("Could not find the Steam user storage folder.")
    home = pathlib.Path.home()
    return home, pwd.getpwuid(os.getuid())


def _locations():
    home, user = _home()
    if not home.is_dir():
        return []
    locations = [("internal", home / "Games" / "Game Library" / "GOG")]
    mounts = pathlib.Path("/run/media") / user.pw_name
    if mounts.is_dir():
        for entry in sorted(mounts.iterdir(), key=lambda p: p.name):
            if entry.is_dir() and not entry.is_symlink() and os.path.ismount(entry):
                locations.append(("sd:" + entry.name, entry / "Game Library" / "GOG"))
    result = []
    for key, path in locations:
        # A parent writable by the actual account is needed; no new folder
        # is created until the user confirms a download.
        ancestor = path
        while not ancestor.exists() and ancestor != ancestor.parent:
            ancestor = ancestor.parent
        if ancestor.is_symlink() or not ancestor.is_dir():
            continue
        if not os.access(ancestor, os.W_OK):
            continue
        try:
            space = os.statvfs(ancestor)
            free = int(space.f_bavail * space.f_frsize)
        except OSError:
            continue
        result.append({"key": key, "label": "Internal storage" if key == "internal"
                       else "SD card · " + key[3:], "path": str(path),
                       "free_bytes": free})
    return result


def _gogdl(base):
    binary = pathlib.Path(base) / "bin" / "gogdl"
    if not binary.is_file() or binary.is_symlink():
        raise ValueError("Bundled GOG downloader is missing. Reinstall Game Library.")
    with binary.open("rb") as stream:
        sha = hashlib.file_digest(stream, "sha256").hexdigest()
    if sha != _PINNED_HASH:
        raise ValueError("GOG downloader failed integrity verification.")
    return binary


def _auth_file(gog, account):
    """Separate private gogdl auth file, with GOG token scope kept intact."""
    session = gog._active_session(account)
    home, user = _home()
    folder = home / ".local" / "share" / "game-library" / "gog-auth" / account
    # Account isolation; never write through symlinks.
    for part in (folder, folder.parent, folder.parent.parent, folder.parent.parent.parent):
        if part.is_symlink():
            raise ValueError("GOG account path is unsafe.")
    # Parent directories created by a root Decky service must remain
    # accessible to the actual Steam user, without changing existing dirs.
    to_create = []
    entry = folder
    while not entry.exists() and entry != home:
        to_create.append(entry)
        entry = entry.parent
    for entry in reversed(to_create):
        entry.mkdir(mode=0o700)
        if os.geteuid() == 0:
            os.chown(entry, user.pw_uid, user.pw_gid)
    os.chmod(folder, 0o700)
    dest = folder / "auth.json"
    if dest.is_symlink():
        raise ValueError("GOG account path is unsafe.")
    remaining = max(1, int(float(session["expires_at"]) - time.time()))
    payload = {"46899977096215655": {
        "access_token": session["access"], "refresh_token": session["refresh"],
        "expires_in": remaining, "loginTime": time.time()
    }}
    # gogdl may update its own auth file as tokens are refreshed.
    temp = folder / "auth.tmp"
    if temp.is_symlink():
        raise ValueError("GOG account path is unsafe.")
    with temp.open("w", encoding="utf-8") as stream:
        os.chmod(temp, 0o600)
        json.dump(payload, stream)
    if os.geteuid() == 0:
        os.chown(temp, user.pw_uid, user.pw_gid)
    temp.replace(dest)
    return dest, user


def _execute(argv, user, timeout=None, **kwargs):
    opts = {}
    if os.geteuid() == 0:
        opts = {"user": user.pw_uid, "group": user.pw_gid}
    return subprocess.run(argv, timeout=timeout, shell=False, **opts, **kwargs)


def _size_info(raw):
    """gogdl info has * / language keyed disk sizes, not a flat byte number."""
    value = raw.get("size", {})
    if not isinstance(value, dict):
        return None
    all_sizes = value.get("*", {})
    if isinstance(all_sizes, dict) and isinstance(all_sizes.get("disk_size"), int):
        return max(0, all_sizes["disk_size"])
    return None


def _preflight(gog, base, account, product):
    account, product = _account_and_game(gog, account, product)
    binary = _gogdl(base)
    auth, user = _auth_file(gog, account)
    args = [str(binary), "--auth-config-path", str(auth), "info", product,
            "--platform", "windows", "--skip-dlcs"]
    try:
        result = _execute(args, user, timeout=70, capture_output=True, text=True)
    except (OSError, subprocess.TimeoutExpired):
        raise ValueError("Could not read GOG game download metadata.") from None
    if result.returncode != 0 or len(result.stdout) > 2_000_000:
        raise ValueError("Windows download metadata is unavailable for this game.")
    try:
        info = json.loads(result.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError, TypeError):
        raise ValueError("GOG returned invalid game download metadata.") from None
    folder_name = info.get("folder_name")
    if (not isinstance(folder_name, str) or not _DIR_NAME.fullmatch(folder_name)
            or folder_name in (".", "..")):
        raise ValueError("GOG returned an unsafe game directory.")
    size = _size_info(info)
    locations = _locations()
    return {"ok": True, "product_id": product, "folder": folder_name,
            "size_bytes": size, "locations": locations, "platform": "windows"}


def preflight(gog, base, account, product):
    try:
        return _preflight(gog, base, account, product)
    except ValueError as error:
        return {"ok": False, "reason": str(error)}
    except Exception:
        return {"ok": False, "reason": "GOG download preflight failed."}


def snapshot(account, product):
    key = (str(account), str(product))
    with _LOCK:
        state = _STATES.get(key)
        return dict(state) if state else {"status": "idle", "percent": None}


def _download_thread(key, binary, auth, user, target, product):
    with _LOCK:
        state = _STATES[key]
    proc = None
    try:
        args = [str(binary), "--auth-config-path", str(auth),
                "download", product, "--platform", "windows",
                "--path", str(target), "--skip-dlcs"]
        opts = {"user": user.pw_uid, "group": user.pw_gid} if os.geteuid() == 0 else {}
        with _LOCK:
            if state.get("cancel_requested"):
                state.update(status="cancelled",
                             reason="Download cancelled before it started.")
                return
        proc = subprocess.Popen(args, shell=False, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, text=True, bufsize=1,
                                start_new_session=True, **opts)
        with _LOCK:
            _JOBS[key] = proc
            state["status"] = "downloading"
        for line in proc.stdout:
            progress = _PROGRESS.search(line)
            rate = _RATE.search(line)
            with _LOCK:
                if progress:
                    pct, written, total = progress.groups()
                    state.update(percent=min(100.0, max(0.0, float(pct))),
                                 written_bytes=int(written), total_bytes=int(total))
                if rate:
                    state["speed_mib"] = float(rate.group(1))
        code = proc.wait()
        with _LOCK:
            game_path = pathlib.Path(state["location"])
            complete = code == 0 and game_path.is_dir() and any(game_path.iterdir())
            state["status"] = "cancelled" if state.get("cancel_requested") else (
                "downloaded" if complete else "error")
            state["reason"] = ("Download cancelled; partial files were kept." if
                state["status"] == "cancelled" else
                "GOG download did not complete. Partial files were kept." if not complete else
                "Download complete. Launch setup is not yet available.")
            if complete:
                state["percent"] = 100.0
    except Exception:
        with _LOCK:
            state.update(status="error", reason="GOG downloader failed to start.")
    finally:
        if proc and proc.poll() is None:
            try:
                os.killpg(proc.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
        with _LOCK:
            _JOBS.pop(key, None)


def start(gog, base, account, product, location):
    try:
        account, product = _account_and_game(gog, account, product)
        key = (account, product)
        with _LOCK:
            if key in _JOBS or _STATES.get(key, {}).get("status") in ("starting", "downloading"):
                return {"ok": False, "reason": "This GOG game is already downloading."}
        plan = _preflight(gog, base, account, product)
        choice = next((x for x in plan["locations"] if x["key"] == location), None)
        if not choice:
            return {"ok": False, "reason": "Selected storage location is unavailable."}
        if plan["size_bytes"] is not None and choice["free_bytes"] < (
                plan["size_bytes"] + 512 * 1024 * 1024):
            return {"ok": False, "reason": "Not enough free storage for this game."}
        target = pathlib.Path(choice["path"])
        game = target / plan["folder"]
        if game.exists() or game.is_symlink():
            return {"ok": False, "reason": "Install directory already exists; no files were modified."}
        home, user = _home()
        for ancestor in (target, target.parent, target.parent.parent):
            if ancestor.is_symlink():
                return {"ok": False, "reason": "Unsafe storage path."}
        to_create = []
        entry = target
        while not entry.exists() and entry != entry.parent:
            to_create.append(entry)
            entry = entry.parent
        for entry in reversed(to_create):
            entry.mkdir(mode=0o755)
            if os.geteuid() == 0:
                try:
                    os.chown(entry, user.pw_uid, user.pw_gid)
                except OSError:
                    # Some removable filesystems have no POSIX ownership.
                    pass
        auth, user = _auth_file(gog, account)
        binary = _gogdl(base)
        with _LOCK:
            if key in _JOBS or _STATES.get(key, {}).get("status") in ("starting", "downloading"):
                return {"ok": False, "reason": "This GOG game is already downloading."}
            _STATES[key] = {"status": "starting", "percent": 0.0,
                            "written_bytes": None, "total_bytes": None,
                            "speed_mib": None, "reason": "",
                            "location": str(game), "cancel_requested": False}
            thread = threading.Thread(target=_download_thread,
                      args=(key, binary, auth, user, target, product),
                      daemon=True, name="game-library-gog-download")
            thread.start()
        return {"ok": True, "status": "starting"}
    except ValueError as error:
        return {"ok": False, "reason": str(error)}
    except Exception:
        return {"ok": False, "reason": "Could not begin GOG installation."}


def cancel(account, product):
    key = (str(account), str(product))
    with _LOCK:
        state = _STATES.get(key)
        proc = _JOBS.get(key)
        if not state or state.get("status") not in ("starting", "downloading"):
            return {"ok": False, "reason": "No running GOG download."}
        state["cancel_requested"] = True
        if proc:
            try:
                os.killpg(proc.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
        else:
            state["status"] = "cancelled"
    return {"ok": True}


def stop_all():
    with _LOCK:
        for state in _STATES.values():
            if state.get("status") in ("starting", "downloading"):
                state["cancel_requested"] = True
        for proc in list(_JOBS.values()):
            try:
                os.killpg(proc.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
