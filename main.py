"""Game Library: read-only TabMaster integration and safe update discovery."""
import asyncio
import importlib.util
import json
import os
import pathlib
import re

BASE = pathlib.Path(__file__).resolve().parent

def _load_updater():
    """Load our own packaged module by path, not Python's global import path.

    Decky Loader may import main.py with a working directory/sys.path that
    excludes the plugin directory, causing 'No module named updates' despite
    updates.py being correctly included in the install ZIP.
    """
    module_path = BASE / "updates.py"
    if not module_path.is_file():
        raise RuntimeError("Plugin installation is incomplete (updates.py missing). Reinstall the latest ZIP.")
    spec = importlib.util.spec_from_file_location("game_library_local_updates", str(module_path))
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load packaged updater module.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module



def _tabmaster_path():
    settings_dir = os.environ.get("DECKY_PLUGIN_SETTINGS_DIR", "")
    if not settings_dir:
        return None
    root = pathlib.Path(settings_dir).resolve().parent
    # Read only the explicitly named peer plugin's settings, never walk the file system.
    path = root / "TabMaster" / "settings.json"
    return path if path.is_file() else None


class Plugin:
    async def _main(self):
        pass

    async def _unload(self):
        pass

    async def get_installed_version(self):
        try:
            package = json.loads((BASE / "package.json").read_text(encoding="utf-8"))
            version = package.get("version")
            if not isinstance(version, str) or not re.fullmatch(r"[0-9A-Za-z][0-9A-Za-z.+-]{0,63}", version):
                raise ValueError("invalid version")
            return {"version": version}
        except (OSError, ValueError, TypeError) as exc:
            return {"version": "", "error": type(exc).__name__}

    async def get_tabmaster_tabs(self, user_id: str = ""):
        """Read TabMaster's active-user tab *definitions*, never edit its settings.

        Custom filters are returned to the frontend only for supported local evaluation;
        unsupported filters are not approximated as full-game collections.
        """
        path = _tabmaster_path()
        if not path:
            return {"available": False, "reason": "TabMaster settings not found", "tabs": []}
        if not isinstance(user_id, str) or not re.fullmatch(r"[0-9]{1,20}", user_id):
            return {"available": False, "reason": "Active Steam account not detected", "tabs": []}
        try:
            if path.stat().st_size > 2_000_000:
                raise ValueError("TabMaster settings too large")
            data = json.loads(path.read_text(encoding="utf-8"))
            users = data.get("usersDict", {})
            account_id = str(int(user_id) & 0xffffffff)
            user = users.get(account_id) if isinstance(users, dict) else None
            if not isinstance(user, dict):
                return {"available": False, "reason": "TabMaster profile not found for this Steam account", "tabs": []}
            defs = user.get("tabs", {})
            if not isinstance(defs, dict):
                raise ValueError("invalid tab definitions")
            output = []
            for key, val in defs.items():
                if not isinstance(val, dict) or not isinstance(key, str):
                    continue
                position = val.get("position", -1)
                if type(position) is not int or position < 0:
                    continue
                title = val.get("title", key)
                if not isinstance(title, str) or not title.strip():
                    continue
                filters = val.get("filters")
                # Only carry a bounded subset, to avoid moving arbitrary plugin settings to the UI.
                if not isinstance(filters, list):
                    filters = None
                if filters and len(filters) > 40:
                    filters = None
                output.append({
                    "id": key[:128],
                    "title": title[:80],
                    "position": position,
                    "filters": filters,
                    "filtersMode": val.get("filtersMode", "and") if val.get("filtersMode") in ("and", "or") else "and",
                })
            output.sort(key=lambda entry: (entry["position"], entry["title"]))
            return {"available": True, "tabs": output[:50], "reason": ""}
        except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
            return {"available": False, "reason": "Unable to read TabMaster settings: " + type(exc).__name__, "tabs": []}

    async def validate_github_releases(self, release_json: str):
        try:
            return {"ok": True, **_load_updater().validate_github_feed(BASE / "package.json", release_json)}
        except Exception as exc:
            return {"ok": False, "available": False, "latest": None, "error": str(exc)[:220]}

    async def check_updates(self):
        try:
            updater = _load_updater()
            return {"ok": True, **await asyncio.to_thread(updater.check_github_update, BASE / "package.json")}
        except Exception as exc:
            return {"ok": False, "available": False, "latest": None, "error": str(exc)[:220]}
