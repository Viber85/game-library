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



def _load_hltb():
    """Load the locally packaged HLTB helper, regardless of Decky's Python sys.path."""
    spec = importlib.util.spec_from_file_location("game_library_local_hltb", str(BASE / "hltb.py"))
    if not spec or not spec.loader:
        raise RuntimeError("HowLongToBeat helper missing. Reinstall the plugin.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_system_status():
    """Load bundled local telemetry without depending on Decky's sys.path."""
    spec = importlib.util.spec_from_file_location(
        "game_library_local_status", str(BASE / "system_status.py"))
    if spec is None or spec.loader is None:
        raise RuntimeError("system_status.py missing")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _settings_path():
    directory = os.environ.get("DECKY_PLUGIN_SETTINGS_DIR")
    return pathlib.Path(directory) / "game_library.json" if directory else BASE / ".game_library_settings.json"


def _read_preferences():
    try:
        saved = json.loads(_settings_path().read_text(encoding="utf-8"))
        return saved if isinstance(saved, dict) else {}
    except (OSError, ValueError, TypeError):
        return {}


def _write_preferences(settings):
    """Atomically preserve unrelated preferences, including the Home option."""
    path = _settings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    # Drop obsolete v0.4.13 manual tab-source preference on next settings save.
    settings.pop("tab_source", None)
    temporary.write_text(json.dumps(settings), encoding="utf-8")
    os.replace(temporary, path)


def _builtin_theme_bundle(theme_id):
    """Only read bundled, fixed theme assets; no user-provided paths or CSS."""
    if theme_id != "midnight":
        raise ValueError("Unsupported built-in theme")
    assets = BASE / "system-theme"
    scopes = {
        "main": (
            "shared.css", "buttons.css", "settings.css", "settings-extras.css",
            "game-details.css", "game-details-extras.css", "downloads.css", "dialogs.css",
            "steam-input.css", "volume.css", "power-menu.css",
            "settings-special.css", "settings-focus.css",
            "decky-settings.css",
            "settings-gamepad-focus.css",
        ),
        "overlay": (
            "shared.css", "buttons.css", "menus.css", "running-menu.css",
            "steam-input.css", "qam.css", "dialogs.css",
            "volume.css", "power-menu.css",
        ),
    }
    result = {}
    for scope, files in scopes.items():
        chunks = []
        for filename in files:
            path = assets / filename
            if not path.is_file() or path.is_symlink() or path.stat().st_size > 100_000:
                raise OSError("Bundled CSS unavailable: " + filename)
            chunks.append(path.read_text(encoding="utf-8"))
        result[scope] = "\n".join(chunks)
    return {"id": theme_id, "name": "Midnight", "css": result}



def _runtime_cache_path():
    directory = os.environ.get("DECKY_PLUGIN_RUNTIME_DIR") or os.environ.get("DECKY_PLUGIN_SETTINGS_DIR")
    return pathlib.Path(directory) / "hltb_cache.json" if directory else BASE / "hltb_cache.json"


def _load_protondb():
    """Load packaged module by file path, irrespective of Decky's sys.path."""
    spec = importlib.util.spec_from_file_location("game_library_local_protondb", str(BASE / "protondb.py"))
    if not spec or not spec.loader:
        raise RuntimeError("ProtonDB helper missing. Reinstall the plugin.")
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


def _tabmaster_enabled():
    """Decky's loader.json is authoritative for the disabled plugin list.

    Merely having TabMaster/settings.json is NOT proof that the plugin runs.
    When the Decky state is missing or malformed, fail closed rather than
    mistakenly treating an old TabMaster configuration as active.
    """
    settings_dir = os.environ.get("DECKY_PLUGIN_SETTINGS_DIR", "")
    if not settings_dir:
        return False, "Decky plugin status unavailable"
    root = pathlib.Path(settings_dir).resolve().parent
    loader = root / "loader.json"
    try:
        if not loader.is_file() or loader.stat().st_size > 2_000_000:
            return False, "Decky loader state unavailable"
        saved = json.loads(loader.read_text(encoding="utf-8"))
        if not isinstance(saved, dict):
            return False, "Invalid Decky loader state"
        disabled = saved.get("disabled_plugins", [])
        if not isinstance(disabled, list) or not all(isinstance(name, str) for name in disabled):
            return False, "Invalid Decky disabled plugin list"
        if "TabMaster" in disabled:
            return False, "TabMaster disabled in Decky Loader"
        return True, ""
    except (OSError, ValueError, TypeError):
        return False, "Unable to read Decky plugin state"


class Plugin:
    _hltb_service = None
    _protondb_service = None
    _protondb_name_resolver = None

    async def _main(self):
        pass

    async def get_system_status(self):
        """Read-only hardware status. Unknown values remain None."""
        try:
            return await asyncio.to_thread(_load_system_status().get_system_status)
        except (OSError, RuntimeError, ValueError):
            return {"battery": None, "wifi": None, "bluetooth": None}

    async def get_dashboard_settings(self):
        """Enabled by default on Steam Home, with a persisted opt-out in Decky."""
        return {"default_home": _read_preferences().get("default_home", True) is True}

    async def set_dashboard_settings(self, default_home: bool):
        if type(default_home) is not bool:
            return False
        try:
            saved = _read_preferences()
            saved["default_home"] = default_home
            _write_preferences(saved)
            return True
        except OSError:
            return False

    async def get_theme_settings(self):
        """Midnight is the built-in default; Off restores native Steam colors."""
        theme = _read_preferences().get("theme_id", "midnight")
        return {"theme_id": theme if theme in ("midnight", "off") else "midnight",
                "available": [{"id": "midnight", "name": "Midnight"}]}

    async def set_theme_settings(self, theme_id: str):
        if theme_id not in ("midnight", "off") or type(theme_id) is not str:
            return False
        try:
            saved = _read_preferences()
            saved["theme_id"] = theme_id
            _write_preferences(saved)
            return True
        except OSError:
            return False

    async def get_builtin_theme(self, theme_id: str = "midnight"):
        try:
            return {"ok": True, **_builtin_theme_bundle(theme_id)}
        except (OSError, ValueError, UnicodeError) as error:
            return {"ok": False, "error": type(error).__name__}

    async def hltb_times(self, appid: int, name: str):
        if self._hltb_service is None:
            self._hltb_service = _load_hltb().HltbService(_runtime_cache_path())
        return await asyncio.to_thread(self._hltb_service.lookup, appid, name)

    async def protondb_tier(self, appid: int):
        if self._protondb_service is None:
            cache = _runtime_cache_path().with_name("protondb_cache.json")
            self._protondb_service = _load_protondb().ProtonDBService(cache)
        return await asyncio.to_thread(self._protondb_service.get, appid)

    async def protondb_for_game(self, appid: int, title: str, non_steam: bool):
        """Look up community ProtonDB compatibility, resolving Epic/GOG by title.

        ProtonDB is indexed by the matching Steam AppID, NOT the local
        Unifideck shortcut ID. All Steam name lookups use a strict match
        threshold before we ask ProtonDB for the published community tier.
        """
        if type(non_steam) is not bool or not isinstance(title, str):
            return {"status": "unavailable", "tier": None, "reason": "Invalid request"}
        if self._protondb_service is None:
            cache = _runtime_cache_path().with_name("protondb_cache.json")
            self._protondb_service = _load_protondb().ProtonDBService(cache)
        appid_to_query = appid
        matched_title = None
        if non_steam:
            if self._protondb_name_resolver is None:
                cache = _runtime_cache_path().with_name("protondb_title_cache.json")
                self._protondb_name_resolver = _load_protondb().ProtonDBNameResolver(cache)
            try:
                resolved = await asyncio.to_thread(self._protondb_name_resolver.resolve, title)
            except Exception as error:
                return {"status": "error", "tier": None,
                        "reason": "Title search unavailable: " + type(error).__name__}
            if not resolved:
                return {"status": "unavailable", "tier": None,
                        "reason": "No reliable Steam match for this title"}
            appid_to_query = resolved["appid"]
            matched_title = resolved["name"]
        result = await asyncio.to_thread(self._protondb_service.get, appid_to_query)
        return {**result, "appid": appid_to_query, "matched_title": matched_title}



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
        # Auto is built in, not a user-configurable setting. Obsolete saved
        # "tab_source" values from v0.4.13 are deliberately ignored.
        mode = "auto"
        enabled, reason = _tabmaster_enabled()
        if not enabled:
            return {"available": False, "reason": reason, "tabs": [], "mode": mode}
        path = _tabmaster_path()
        if not path:
            return {"available": False, "reason": "TabMaster settings not found", "tabs": [], "mode": mode}
        if not isinstance(user_id, str) or not re.fullmatch(r"[0-9]{1,20}", user_id):
            return {"available": False, "reason": "Active Steam account not detected", "tabs": [], "mode": mode}
        try:
            if path.stat().st_size > 2_000_000:
                raise ValueError("TabMaster settings too large")
            data = json.loads(path.read_text(encoding="utf-8"))
            users = data.get("usersDict", {})
            account_id = str(int(user_id) & 0xffffffff)
            user = users.get(account_id) if isinstance(users, dict) else None
            if not isinstance(user, dict):
                return {"available": False, "reason": "TabMaster profile not found for this Steam account", "tabs": [], "mode": mode}
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
            return {"available": bool(output), "tabs": output[:50], "reason": "" if output else "TabMaster has no visible tabs", "mode": mode}
        except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
            return {"available": False, "reason": "Unable to read TabMaster settings: " + type(exc).__name__, "tabs": [], "mode": mode}

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
