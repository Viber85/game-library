"""Safe, app-scoped cleanup after a user-confirmed Steam download cancel.

Steam's native uninstall runs first. Only delete a single AppID's Proton
compatdata and shadercache after Steam has removed its manifest and partial
download folder. Never delete arbitrary paths or Steam's own game content.
"""
import pathlib
import re
import shutil
import time

MAX_APP_ID = 0x7FFFFFFF
HOME_ROOTS = (pathlib.Path("/home"), pathlib.Path("/var/home"))
MOUNT_ROOTS = ("/run/media/", "/media/", "/mnt/", "/var/mnt/")


def valid_app_id(appid):
    return type(appid) is int and 0 < appid < MAX_APP_ID


def steam_owner_home(plugin_dir):
    """The plugin owner, never every account in /home on a multi-user system."""
    path = pathlib.Path(plugin_dir).resolve()
    for parent in (path, *path.parents):
        if parent.parent in HOME_ROOTS and parent.is_dir():
            return parent
    return None


def library_roots(plugin_dir):
    """Recognized Steam root and registered libraries for the plugin owner."""
    home = steam_owner_home(plugin_dir)
    if home is None:
        return []
    possible = [
        home / ".local/share/Steam",
        home / ".steam/steam",
        home / ".steam/root",
        home / ".var/app/com.valvesoftware.Steam/.local/share/Steam",
    ]
    roots, seen = [], set()

    def add(root):
        try:
            candidate = pathlib.Path(root)
            if not candidate.is_absolute() or len(str(candidate)) > 512:
                return
            real = candidate.resolve(strict=True)
            # Refuse non-user, non-mounted roots obtained from libraryfolders.vdf.
            trusted = real == home or home in real.parents or any(
                str(real).startswith(prefix) for prefix in MOUNT_ROOTS
            )
            steamapps = real / "steamapps"
            if not trusted or str(real) in seen or steamapps.is_symlink() or not steamapps.is_dir():
                return
            seen.add(str(real))
            roots.append(real)
        except (OSError, RuntimeError, ValueError):
            return

    for root in possible:
        add(root)
    for root in list(roots):
        file = root / "steamapps/libraryfolders.vdf"
        try:
            if file.is_symlink() or not file.is_file() or file.stat().st_size > 1_000_000:
                continue
            content = file.read_text(encoding="utf-8", errors="replace")
            for value in re.findall(r'"path"\s*"([^"]{1,512})"', content, flags=re.I)[:64]:
                add(value.replace("\\\\", "\\"))
        except OSError:
            continue
    return roots


def _targets(steamapps, appid):
    name = str(appid)
    for dirname in ("compatdata", "shadercache"):
        parent = steamapps / dirname
        if parent.is_symlink() or not parent.is_dir():
            continue
        target = parent / name
        # Never follow user-created symlinks, even ones pointing to a directory.
        if target.is_symlink():
            yield target, "symlink"
        elif target.is_dir():
            yield target, "directory"
        elif target.exists():
            yield target, "unexpected"
        # No arbitrary path arguments are accepted.


def clean_cancelled_app_data(appid, roots):
    """One safe attempt. Native Steam uninstaller must finish before this."""
    if not valid_app_id(appid):
        return {"ok": False, "status": "invalid", "removed": []}
    roots = list(roots)
    if not roots:
        return {"ok": False, "status": "no-libraries", "removed": []}

    # Refuse cleanup if ANY recognized Steam library still has this app's
    # manifest or incomplete download, including a different target disk.
    for root in roots:
        steamapps = pathlib.Path(root) / "steamapps"
        manifest = steamapps / ("appmanifest_%d.acf" % appid)
        downloading = steamapps / "downloading" / str(appid)
        if manifest.exists() or manifest.is_symlink() or downloading.exists() or downloading.is_symlink():
            return {"ok": False, "status": "steam-busy", "removed": []}

    removed, skipped = [], []
    for root in roots:
        steamapps = pathlib.Path(root) / "steamapps"
        for target, kind in _targets(steamapps, appid):
            if kind != "directory":
                skipped.append(str(target))
                continue
            try:
                # Only exact, numeric, AppID-named direct children.
                if target.name != str(appid) or target.parent.name not in ("compatdata", "shadercache"):
                    skipped.append(str(target))
                    continue
                shutil.rmtree(target)
                removed.append(str(target))
            except (OSError, RuntimeError):
                skipped.append(str(target))
    return {"ok": not skipped,
            "status": "cleaned" if not skipped else "partial",
            "removed": removed, "skipped": skipped}


def wait_for_native_uninstall_and_cleanup(appid, plugin_dir, seconds=30):
    """Bounded wait; never delete while Steam still owns download/install files."""
    if not valid_app_id(appid):
        return {"ok": False, "status": "invalid", "removed": []}
    roots = library_roots(plugin_dir)
    if not roots:
        return {"ok": False, "status": "no-libraries", "removed": []}
    deadline = time.monotonic() + max(0, min(float(seconds), 45))
    while True:
        result = clean_cancelled_app_data(appid, roots)
        if result["status"] != "steam-busy":
            return result
        if time.monotonic() >= deadline:
            return result
        time.sleep(0.6)
