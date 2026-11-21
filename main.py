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



def _steam_clock_value(value):
    """Decode only Steam's explicit user preference, never infer it from locale."""
    if type(value) is bool:
        return value
    if type(value) is int and value in (0, 1):
        return bool(value)
    if isinstance(value, str) and value.strip().lower() in ("true", "false", "1", "0"):
        return value.strip().lower() in ("true", "1")
    return None


def _steam_clock_setting_from_vdf(contents):
    """FriendsUIJSON is Steam's 24-hour toggle in the active user's localconfig.vdf."""
    # VDF contains an escaped JSON string. Parse this setting specifically,
    # rather than treating the whole (possibly large) localconfig as JSON.
    match = re.search(r'"FriendsUIJSON"\s*"((?:\\.|[^"\\])*)"', contents, re.I)
    if match:
        try:
            decoded = json.loads('"' + match.group(1) + '"')
            settings = json.loads(decoded)
            if isinstance(settings, dict):
                return _steam_clock_value(settings.get("b24HourClock"))
        except (ValueError, TypeError):
            pass
    # Older Steam clients store this field directly as a VDF key.
    match = re.search(r'"b24HourClock"\s*"(true|false|1|0)"', contents, re.I)
    return _steam_clock_value(match.group(1)) if match else None


def _steam_clock_config_paths(account_id):
    """Only known Steam userdata paths for the requested numeric Steam account32."""
    homes = [pathlib.Path.home()]
    try:
        # Decky may run as root while Steam runs under /home/deck, /home/bazzite
        # or another non-root account. Never browse arbitrary user files.
        homes.extend(home for home in list(pathlib.Path("/home").iterdir())[:32]
                     if home.is_dir() and not home.is_symlink())
    except OSError:
        pass
    seen = set()
    for home in homes:
        for root in (home / ".local/share/Steam",
                     home / ".steam/steam",
                     home / ".var/app/com.valvesoftware.Steam/.local/share/Steam"):
            path = root / "userdata" / account_id / "config/localconfig.vdf"
            if str(path) not in seen:
                seen.add(str(path))
                yield path


def _get_steam_clock_format(account_id):
    if not isinstance(account_id, str) or not re.fullmatch(r"[0-9]{1,10}", account_id):
        return None
    if int(account_id) <= 0:
        return None
    for path in _steam_clock_config_paths(account_id):
        try:
            if not path.is_file() or path.is_symlink() or path.stat().st_size > 8_000_000:
                continue
            value = _steam_clock_setting_from_vdf(path.read_text(encoding="utf-8", errors="replace"))
            if value is not None:
                return value
        except OSError:
            continue
    return None


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

def _manual_collection_snapshot(settings):
    """Keep only safe Steam app IDs; never infer finished games or modify Steam."""
    raw = settings.get("manual_collections")
    raw = raw if isinstance(raw, dict) else {}
    sections = {}
    for name in ("backlog", "completed"):
        items = raw.get(name, [])
        sections[name] = sorted({
            item for item in (items if isinstance(items, list) else [])
            if type(item) is int and 0 < item <= 9007199254740991
        })
    # A title must never appear as both planned and finished.
    completed = set(sections["completed"])
    sections["backlog"] = [item for item in sections["backlog"] if item not in completed]
    return sections



def _builtin_theme_bundle(theme_id):
    """Only read bundled, fixed theme assets; no user-provided paths or CSS."""
    if theme_id != "midnight":
        raise ValueError("Unsupported built-in theme")
    assets = BASE / "system-theme"
    scopes = {
        "main": (
            "shared.css", "buttons.css", "settings.css", "settings-extras.css",
            "game-details.css", "game-details-extras.css", "game-details-midnight.css",
            "downloads.css", "dialogs.css",
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





def _load_steamgriddb():
    """Import bundled optional image provider without requiring plugin sys.path."""
    path = BASE / "steamgriddb.py"
    spec = importlib.util.spec_from_file_location("game_library_local_steamgriddb", str(path))
    if spec is None or spec.loader is None:
        raise RuntimeError("SteamGridDB helper unavailable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _steamgriddb_config_dir():
    return _settings_path().parent


def _steamgriddb_cache_path():
    directory = os.environ.get("DECKY_PLUGIN_RUNTIME_DIR") or os.environ.get("DECKY_PLUGIN_SETTINGS_DIR")
    return pathlib.Path(directory) / "steamgriddb_artwork_cache.json" if directory else BASE / "steamgriddb_artwork_cache.json"


def _runtime_cache_path():
    directory = os.environ.get("DECKY_PLUGIN_RUNTIME_DIR") or os.environ.get("DECKY_PLUGIN_SETTINGS_DIR")
    return pathlib.Path(directory) / "hltb_cache.json" if directory else BASE / "hltb_cache.json"


def _steam_size_cache_path():
    directory = os.environ.get("DECKY_PLUGIN_RUNTIME_DIR") or os.environ.get("DECKY_PLUGIN_SETTINGS_DIR")
    return pathlib.Path(directory) / "steam_size_cache.json" if directory else BASE / "steam_size_cache.json"


def _load_steam_size():
    """Load packaged local size metadata backend without relying on sys.path."""
    path = BASE / "steam_size.py"
    spec = importlib.util.spec_from_file_location("game_library_local_steam_size", str(path))
    if spec is None or spec.loader is None:
        raise RuntimeError("Steam size helper missing. Reinstall plugin.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


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
    _steam_size_service = None
    _hltb_service = None
    _protondb_service = None
    _protondb_name_resolver = None
    _steamgriddb_service = None

    async def _main(self):
        pass

    async def get_steam_clock_format(self, account_id: str = ""):
        """Read the same 12/24-hour preference used by SteamOS, never change it."""
        try:
            hour24 = await asyncio.to_thread(_get_steam_clock_format, account_id)
            return {"hour24": hour24}
        except (OSError, ValueError, TypeError):
            return {"hour24": None}

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

    async def get_manual_collections(self):
        """Read user-assigned game status from Decky's persisted settings."""
        return {"ok": True, "collections": _manual_collection_snapshot(_read_preferences())}

    async def set_manual_collection(self, section: str, appid: int, included: bool):
        """Atomic preference replacement; Steam/TabMaster collections are untouched."""
        if type(section) is not str or section not in ("backlog", "completed") or \
                type(appid) is not int or not (0 < appid <= 9007199254740991) or \
                type(included) is not bool:
            return {"ok": False, "reason": "Invalid manual collection change"}
        try:
            saved = _read_preferences()
            state = _manual_collection_snapshot(saved)
            items = set(state[section])
            if included:
                items.add(appid)
                other = "completed" if section == "backlog" else "backlog"
                state[other] = [item for item in state[other] if item != appid]
            else:
                items.discard(appid)
            state[section] = sorted(items)
            saved["manual_collections"] = state
            _write_preferences(saved)
            return {"ok": True, "collections": state}
        except OSError:
            return {"ok": False, "reason": "Failed to save manual collections"}

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


    async def get_steamgriddb_settings(self):
        """Never expose the actual key to CEF, even during diagnostics."""
        try:
            provider = _load_steamgriddb()
            configured = bool(provider.read_key(_steamgriddb_config_dir()))
            enabled = _read_preferences().get("steamgriddb_enabled", True) is True
            return {"enabled": enabled, "has_key": configured}
        except (OSError, RuntimeError):
            return {"enabled": False, "has_key": False}

    async def set_steamgriddb_key(self, key: str):
        if type(key) is not str:
            return {"ok": False, "code": "invalid_format", "reason": "Key format invalid"}
        try:
            provider = _load_steamgriddb()
        except (OSError, RuntimeError, ValueError):
            return {"ok": False, "code": "plugin_error",
                    "reason": "SteamGridDB backend unavailable. Reinstall plugin"}
        token = key.strip()
        if not provider.valid_key(token):
            return {"ok": False, "code": "invalid_format", "reason": "Key format invalid"}
        explanations = {
            "invalid_key": "SteamGridDB rejected the API key (HTTP 401). Generate a new key",
            "access_forbidden": "SteamGridDB refused API access (HTTP 403). Check permissions or service status",
            "rate_limited": "SteamGridDB rate limit (HTTP 429). Try again later",
            "api_not_found": "SteamGridDB API endpoint not found (HTTP 404)",
            "provider_unavailable": "SteamGridDB server temporarily unavailable (HTTP 5xx)",
            "api_http_error": "SteamGridDB returned an unexpected HTTP error",
            "ssl_certificate": "SSL certificate verification failed. Check system date/time and Decky CA trust",
            "timeout": "SteamGridDB connection timed out",
            "connection": "Connection to SteamGridDB was interrupted",
            "network": "Could not reach SteamGridDB. Check the network or DNS",
            "invalid_response": "SteamGridDB response was not valid JSON",
            "api_rejected": "SteamGridDB API rejected the verification request",
            "unknown": "SteamGridDB verification failed",
        }
        try:
            await asyncio.to_thread(provider.verify_key, token)
            saved = await asyncio.to_thread(provider.save_key,
                                              _steamgriddb_config_dir(), token)
            return {"ok": bool(saved), "code": "" if saved else "save_failed",
                    "reason": "" if saved else "Unable to save key"}
        except provider.KeyVerificationError as error:
            code = error.code if error.code in explanations else "unknown"
            return {"ok": False, "code": code, "reason": explanations[code]}
        except (OSError, RuntimeError, ValueError):
            return {"ok": False, "code": "plugin_error",
                    "reason": "SteamGridDB verification failed inside plugin"}

    async def clear_steamgriddb_key(self):
        return await asyncio.to_thread(_load_steamgriddb().delete_key,
                                        _steamgriddb_config_dir())

    async def set_steamgriddb_enabled(self, enabled: bool):
        if type(enabled) is not bool:
            return False
        try:
            saved = _read_preferences()
            saved["steamgriddb_enabled"] = enabled
            _write_preferences(saved)
            return True
        except OSError:
            return False

    async def steamgriddb_art(self, appid: int, title: str, non_steam: bool):
        """Only missing artwork for Steam games; read-only Steam library."""
        if type(appid) is not int or not (1 <= appid <= 0xffffffff) or \
                type(non_steam) is not bool or non_steam or \
                type(title) is not str or not (2 <= len(title.strip()) <= 180):
            return {"status": "invalid", "cover": None, "hero": None}
        if _read_preferences().get("steamgriddb_enabled", True) is not True:
            return {"status": "disabled", "cover": None, "hero": None}
        try:
            provider = _load_steamgriddb()
            key = provider.read_key(_steamgriddb_config_dir())
            if not key:
                return {"status": "needs_key", "cover": None, "hero": None}
            if self._steamgriddb_service is None:
                self._steamgriddb_service = provider.ArtworkService(_steamgriddb_cache_path())
            return await asyncio.to_thread(self._steamgriddb_service.lookup, title, key)
        except (OSError, RuntimeError, ValueError):
            return {"status": "error", "cover": None, "hero": None}

    def _steam_size_cache_service(self):
        if self._steam_size_service is None:
            self._steam_size_service = _load_steam_size().SteamSizeService(
                _steam_size_cache_path())
        return self._steam_size_service

    async def steam_size_cached_bulk(self, appids: list):
        """Read-only local cache: never fetch hundreds of Store appdetails."""
        if not isinstance(appids, list) or len(appids) > 1000:
            return {"entries": []}
        try:
            return await asyncio.to_thread(self._steam_size_cache_service().cached_bulk, appids)
        except (OSError, RuntimeError, ValueError):
            return {"entries": []}

    async def steam_install_size(self, appid: int):
        """Selected Steam title only; Steam Store requirements are estimates."""
        if type(appid) is not int or not 1 <= appid <= 0xFFFFFFFF:
            return {"status": "invalid"}
        try:
            return await asyncio.to_thread(self._steam_size_cache_service().lookup, appid)
        except (OSError, RuntimeError, ValueError):
            return {"status": "error"}

    def _hltb_cache_service(self):
        if self._hltb_service is None:
            self._hltb_service = _load_hltb().HltbService(_runtime_cache_path())
        return self._hltb_service

    async def hltb_cached_bulk(self, games: list):
        """Serve existing local JSON cache to Game Mode without any network."""
        if not isinstance(games, list) or len(games) > 1000:
            return {"entries": []}
        return await asyncio.to_thread(self._hltb_cache_service().cached_bulk, games)

    async def hltb_times(self, appid: int, name: str):
        return await asyncio.to_thread(self._hltb_cache_service().lookup, appid, name)

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
