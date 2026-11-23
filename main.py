"""Game Library: independent SteamOS library and update discovery."""
import asyncio
import importlib.util
import json
import os
import pathlib
import re

BASE = pathlib.Path(__file__).resolve().parent

def _load_gog():
    """Load our own GOG provider, never another installed plugin."""
    path = BASE / "gog.py"
    spec = importlib.util.spec_from_file_location("game_library_private_gog", str(path))
    if spec is None or spec.loader is None:
        raise RuntimeError("Game Library GOG module missing. Reinstall the ZIP.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_GOG_INSTALL_MODULE = None


def _load_gog_install():
    """Cached local download supervisor; jobs survive individual Decky RPC calls."""
    global _GOG_INSTALL_MODULE
    if _GOG_INSTALL_MODULE is None:
        spec = importlib.util.spec_from_file_location(
            "game_library_gog_installer", str(BASE / "gog_install.py"))
        if spec is None or spec.loader is None:
            raise RuntimeError("GOG installer missing from Game Library ZIP.")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        _GOG_INSTALL_MODULE = module
    return _GOG_INSTALL_MODULE


_GOG_PROTON_MODULE = None


def _load_gog_proton():
    """Cached read-only installed Proton tool discovery."""
    global _GOG_PROTON_MODULE
    if _GOG_PROTON_MODULE is None:
        spec = importlib.util.spec_from_file_location(
            "game_library_gog_proton", str(BASE / "gog_proton.py"))
        if spec is None or spec.loader is None:
            raise RuntimeError("GOG Proton discovery module missing.")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        _GOG_PROTON_MODULE = module
    return _GOG_PROTON_MODULE


_GOG_LAUNCH_MODULE = None


def _load_gog_launch():
    global _GOG_LAUNCH_MODULE
    if _GOG_LAUNCH_MODULE is None:
        spec = importlib.util.spec_from_file_location(
            "game_library_gog_launch", str(BASE / "gog_launch.py"))
        if spec is None or spec.loader is None:
            raise RuntimeError("GOG launch module missing from Game Library ZIP.")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        _GOG_LAUNCH_MODULE = module
    return _GOG_LAUNCH_MODULE


def _load_gog_phone():
    """Load our own LAN pairing service once, preserving its active session."""
    spec = importlib.util.spec_from_file_location(
        "game_library_local_gog_phone", str(BASE / "gog_phone.py"))
    if spec is None or spec.loader is None:
        raise RuntimeError("GOG phone pairing module missing. Reinstall plugin.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


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
    # Native Steam Game Details returns to the pre-Compact layout.
    # Do not ship the retired experimental Compact CSS to Steam CEF.
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


def _load_nonsteam_size():
    """Load the bundled read-only Flatpak/AppImage shortcut size resolver."""
    path = BASE / "nonsteam_size.py"
    spec = importlib.util.spec_from_file_location("game_library_local_nonsteam_size", str(path))
    if spec is None or spec.loader is None:
        raise RuntimeError("Non-Steam size module missing. Reinstall plugin.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_steam_size():
    """Load packaged local size metadata backend without relying on sys.path."""
    path = BASE / "steam_size.py"
    spec = importlib.util.spec_from_file_location("game_library_local_steam_size", str(path))
    if spec is None or spec.loader is None:
        raise RuntimeError("Steam size helper missing. Reinstall plugin.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_steam_cancel_cleanup():
    """Import the own app-scoped cleanup helper, never another plugin's code."""
    path = BASE / "steam_cancel_cleanup.py"
    spec = importlib.util.spec_from_file_location("game_library_steam_cancel_cleanup", str(path))
    if spec is None or spec.loader is None:
        raise RuntimeError("Steam cancel cleanup helper missing. Reinstall plugin.")
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


OWN_TAB_BUILTINS = (
    ("AllGames", "All Games", "all"),
    ("Installed", "Installed", "installed"),
    ("Steam", "Steam", "steam"),
    ("NonSteam", "Non-Steam", "nonsteam"),
    ("GOG", "GOG", "gog"),
    ("Favorites", "Favorites", "favorites"),
)
OWN_TAB_FILTERS = {"all", "installed", "not-installed", "steam", "nonsteam", "gog", "favorites"}
OWN_SMART_RULES = {"installed", "not-installed", "steam", "nonsteam", "favorites", "not-favorites", "played"}


def _own_tab_defaults():
    return [
        {"id": key, "title": title, "position": i, "visible": True,
         "kind": kind, "filter": kind}
        for i, (key, title, kind) in enumerate(OWN_TAB_BUILTINS)
    ]


def _own_tab_validate(tabs):
    """Validate only the plugin's original per-account Smart/Manual tab model."""
    if not isinstance(tabs, list) or not 6 <= len(tabs) <= 40:
        raise ValueError("Invalid tab list")
    seen = set()
    output = []
    builtin = {row[0]: row[2] for row in OWN_TAB_BUILTINS}
    for tab in tabs:
        if not isinstance(tab, dict):
            raise ValueError("Invalid tab item")
        tab_id, title = tab.get("id"), tab.get("title")
        position, visible = tab.get("position"), tab.get("visible")
        kind, rule = tab.get("kind"), tab.get("filter")
        mode = tab.get("mode", "smart")
        members = tab.get("members", [])
        rule_join = tab.get("ruleJoin", "all")
        rules = tab.get("rules", None)
        include, exclude = tab.get("forceInclude", []), tab.get("forceExclude", [])
        if rules is None:
            # Preserve v0.6.1 one-filter custom tabs without importing anything.
            rules = ([{"type": rule}] if kind == "custom" and
                     rule in OWN_SMART_RULES else [])
        if (not isinstance(tab_id, str) or
            (tab_id not in builtin and not re.fullmatch(r"custom-[a-z0-9-]{4,50}", tab_id)) or
            tab_id in seen or not isinstance(title, str) or
            not 1 <= len(title.strip()) <= 45 or
            any(ord(char) < 32 for char in title) or
            type(position) is not int or not 0 <= position < 40 or
            type(visible) is not bool or type(kind) is not str or
            type(rule) is not str or rule not in OWN_TAB_FILTERS or
            mode not in ("smart", "manual") or rule_join not in ("all", "any")):
            raise ValueError("Invalid tab field")
        if (not isinstance(rules, list) or len(rules) > 12 or
            any(not isinstance(item, dict) or
                type(item.get("type")) is not str or
                item["type"] not in OWN_SMART_RULES or len(item) != 1
                for item in rules) or
            len({item["type"] for item in rules}) != len(rules)):
            raise ValueError("Invalid Smart rules")
        for game_ids in (members, include, exclude):
            if (not isinstance(game_ids, list) or len(game_ids) > 2000 or
                any(type(item) is not int or
                    not 0 < item <= 9007199254740991
                    for item in game_ids) or
                len(set(game_ids)) != len(game_ids)):
                raise ValueError("Invalid game IDs")
        if set(include).intersection(exclude):
            raise ValueError("Smart include and exclude cannot overlap")
        if tab_id in builtin:
            if (kind != builtin[tab_id] or rule != kind or
                mode != "smart" or members or rules or include or exclude or
                rule_join != "all"):
                raise ValueError("Built-in tab has an invalid filter")
        elif kind != "custom":
            raise ValueError("Custom tab has an invalid kind")
        seen.add(tab_id)
        output.append({
            "id": tab_id, "title": title.strip(), "position": position,
            "visible": visible, "kind": kind, "filter": rule,
            "mode": mode, "members": sorted(members),
            "rules": [{"type": item["type"]} for item in rules],
            "ruleJoin": rule_join,
            "forceInclude": sorted(include), "forceExclude": sorted(exclude),
        })
    if not set(builtin).issubset(seen):
        raise ValueError("Missing built-in tab")
    if not any(tab["visible"] for tab in output):
        raise ValueError("At least one tab must remain visible")
    if len({tab["position"] for tab in output}) != len(output):
        raise ValueError("Duplicate tab order")
    output.sort(key=lambda tab: tab["position"])
    for index, tab in enumerate(output):
        tab["position"] = index
    return output


def _own_tab_account(account_id):
    if (not isinstance(account_id, str) or
        not re.fullmatch(r"[1-9][0-9]{0,11}", account_id)):
        return None
    return account_id


def _own_tab_read(account_id):
    saved = _read_preferences().get("tabs_by_user", {})
    profile = saved.get(account_id) if isinstance(saved, dict) else None
    if profile is not None:
        try:
            # v0.6.11-test.9 had only five built-ins, with a GOG tab
            # injected by Dashboard. Migrate in memory once without
            # resetting the user's custom tabs, order or visibility.
            if isinstance(profile, list) and not any(
                isinstance(tab, dict) and tab.get("id") == "GOG"
                for tab in profile
            ):
                profile = [*profile, {
                    "id": "GOG", "title": "GOG", "position": len(profile),
                    "visible": True, "kind": "gog", "filter": "gog",
                }]
            return _own_tab_validate(profile)
        except ValueError:
            pass
    return _own_tab_defaults()


class Plugin:
    _nonsteam_size_service = None
    _steam_size_service = None
    _hltb_service = None
    _protondb_service = None
    _protondb_name_resolver = None
    _steamgriddb_service = None

    async def _main(self):
        self._gog_lock = asyncio.Lock()
        self._gog_phone = _load_gog_phone()

    def _phone_provider(self):
        if not hasattr(self, "_gog_phone"):
            self._gog_phone = _load_gog_phone()
        return self._gog_phone

    async def start_gog_phone_pairing(self, account_id: str):
        """Start a 15-minute LAN-only one-use GOG authorization handoff."""
        try:
            return await asyncio.to_thread(self._phone_provider().start, account_id)
        except Exception:
            return {"ok": False, "reason": "Could not start mobile GOG pairing."}

    async def get_gog_phone_status(self, account_id: str):
        """Return safe pairing status, never OAuth codes, passwords or tokens."""
        try:
            return await asyncio.to_thread(self._phone_provider().status, account_id)
        except Exception:
            return {"ok": False, "reason": "Mobile pairing service unavailable."}

    async def cancel_gog_phone_pairing(self, account_id: str):
        """Stop only this plugin's local temporary pairing listener."""
        try:
            return await asyncio.to_thread(self._phone_provider().cancel, account_id)
        except Exception:
            return {"ok": False, "reason": "Could not cancel mobile pairing."}

    async def get_gog_account(self, account_id: str = ""):
        """Return sanitized auth state only; never return GOG credentials."""
        return await asyncio.to_thread(_load_gog().status, account_id)

    async def get_gog_library(self, account_id: str = ""):
        """Owned GOG products read from Game Library's own local cache."""
        return await asyncio.to_thread(_load_gog().library, account_id)

    async def connect_gog_account(self, account_id: str, code_or_url: str):
        """Explicit user-approved code exchange; no password ever enters Decky."""
        if not hasattr(self, "_gog_lock"):
            self._gog_lock = asyncio.Lock()
        async with self._gog_lock:
            return await asyncio.to_thread(_load_gog().connect, account_id, code_or_url)

    async def sync_gog_library(self, account_id: str):
        """Refresh complete owned-library snapshot without touching Steam."""
        if not hasattr(self, "_gog_lock"):
            self._gog_lock = asyncio.Lock()
        async with self._gog_lock:
            return await asyncio.to_thread(_load_gog().sync, account_id)

    async def disconnect_gog_account(self, account_id: str):
        """Forget only Game Library's own GOG session and cached library."""
        if not hasattr(self, "_gog_lock"):
            self._gog_lock = asyncio.Lock()
        async with self._gog_lock:
            return await asyncio.to_thread(_load_gog().disconnect, account_id)

    async def inspect_gog_launch(self, account_id: str, product_id: str):
        """Discover completed Game Library downloads and executable candidates."""
        return await asyncio.to_thread(
            _load_gog_launch().inspect, _load_gog_install(), _load_gog(),
            account_id, product_id)

    async def get_gog_proton_tools(self):
        """List verified locally installed Proton tools, read-only."""
        return await asyncio.to_thread(
            _load_gog_proton().discover, _load_gog_install())

    async def register_gog_shortcut(self, account_id: str, product_id: str,
                                    install_dir: str, executable: str, app_id: int):
        """Only record Steam-created shortcuts for validated owned GOG installs."""
        return await asyncio.to_thread(
            _load_gog_launch().register, _load_gog_install(), _load_gog(),
            account_id, product_id, install_dir, executable, app_id)

    async def finalize_gog_shortcut(self, account_id: str, product_id: str,
                                    app_id: int, compat_tool: str):
        return await asyncio.to_thread(
            _load_gog_launch().finalize, _load_gog_install(), _load_gog(),
            account_id, product_id, app_id, compat_tool)

    async def preflight_gog_install(self, account_id: str, product_id: str):
        """Validate GOG ownership, official gogdl and real install size."""
        return await asyncio.to_thread(
            _load_gog_install().preflight, _load_gog(), BASE, account_id, product_id)

    async def start_gog_install(self, account_id: str, product_id: str, location: str,
                                mode: str = "new"):
        """Start a local GOG-only downloader, never Steam's native installer."""
        return await asyncio.to_thread(
            _load_gog_install().start, _load_gog(), BASE, account_id, product_id, location, mode)

    async def get_gog_install_status(self, account_id: str, product_id: str):
        return _load_gog_install().snapshot(account_id, product_id)

    async def pause_gog_install(self, account_id: str, product_id: str):
        return _load_gog_install().pause(account_id, product_id)

    async def resume_gog_install(self, account_id: str, product_id: str):
        return _load_gog_install().resume(account_id, product_id)

    async def cancel_gog_install(self, account_id: str, product_id: str):
        return _load_gog_install().cancel(account_id, product_id)

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
        """Atomic preference replacement; native Steam collections are untouched."""
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
        """Midnight remains the default; experimental Compact Details is retired."""
        settings = _read_preferences()
        theme = settings.get("theme_id", "midnight")
        return {"theme_id": theme if theme in ("midnight", "off") else "midnight",
                "compact_details": False,
                "available": [{"id": "midnight", "name": "Midnight"}]}

    async def set_compact_details(self, enabled: bool):
        """Allow clearing legacy Compact prefs, never re-enable the retired mode."""
        if type(enabled) is not bool or enabled:
            return False
        try:
            saved = _read_preferences()
            saved["compact_details"] = False
            _write_preferences(saved)
            return True
        except OSError:
            return False

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

    async def gog_steamgriddb_art(self, account_id: str, product_id: str, title: str):
        """Optional artwork for an owned GOG game, never a forged Steam AppID.

        Requires saved SteamGridDB key and opt-in. Validates against the
        GOG account's own cached product IDs and exact titles before lookup.
        """
        if (type(account_id) is not str or type(product_id) is not str or
            type(title) is not str or not (2 <= len(title.strip()) <= 180) or
            not product_id.isdecimal() or len(product_id) > 20):
            return {"status": "invalid", "cover": None, "hero": None}
        if _read_preferences().get("steamgriddb_enabled", True) is not True:
            return {"status": "disabled", "cover": None, "hero": None}
        try:
            library = await asyncio.to_thread(_load_gog().library, account_id)
            if not library.get("ok") or not any(
                str(game.get("id")) == product_id and
                game.get("title") == title for game in library.get("games", [])
                if isinstance(game, dict)
            ):
                return {"status": "invalid", "cover": None, "hero": None}
            provider = _load_steamgriddb()
            key = provider.read_key(_steamgriddb_config_dir())
            if not key:
                return {"status": "needs_key", "cover": None, "hero": None}
            if self._steamgriddb_service is None:
                self._steamgriddb_service = provider.ArtworkService(_steamgriddb_cache_path())
            return await asyncio.to_thread(self._steamgriddb_service.lookup, title, key)
        except (OSError, RuntimeError, ValueError, TypeError):
            return {"status": "error", "cover": None, "hero": None}

    def _nonsteam_size_cache_service(self):
        if self._nonsteam_size_service is None:
            self._nonsteam_size_service = _load_nonsteam_size().NonSteamSizeService()
        return self._nonsteam_size_service

    async def nonsteam_install_size(self, appid: int, title: str, account_id: str = ""):
        """Read exact Steam shortcut and local Flatpak/AppImage bytes only."""
        if type(appid) is not int or not 0 < appid <= 0xFFFFFFFF or \
                type(title) is not str or not 0 < len(title) <= 250 or \
                type(account_id) is not str or len(account_id) > 12:
            return {"status": "invalid"}
        try:
            return await asyncio.to_thread(
                self._nonsteam_size_cache_service().lookup, appid, title, account_id)
        except (OSError, RuntimeError, ValueError, TypeError):
            return {"status": "unavailable"}

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

    async def cleanup_cancelled_steam_game(self, appid: int):
        """After explicit native Steam cancellation, remove only this AppID's
        Proton prefix and shader cache once Steam has stopped using its files.
        No caller-provided filesystem path is accepted.
        """
        if type(appid) is not int or not 0 < appid < 0x7FFFFFFF:
            return {"ok": False, "status": "invalid", "removed": []}
        try:
            helper = _load_steam_cancel_cleanup()
            return await asyncio.to_thread(
                helper.wait_for_native_uninstall_and_cleanup, appid, BASE, 30)
        except (OSError, RuntimeError, ValueError, TypeError) as error:
            return {"ok": False, "status": type(error).__name__, "removed": []}

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

    async def gog_hltb_times(self, product_id: str, name: str):
        """HLTB lookup for a GOG-owned title, isolated from real Steam AppIDs.

        HLTB's cache requires a numeric key. Use a deterministic ID in a
        reserved range above all 32-bit Steam AppIDs. This is a metadata-only
        key and is NEVER passed to Steam's app, install or launch APIs.
        """
        import hashlib
        import re
        if (not isinstance(product_id, str) or
                not re.fullmatch(r"[0-9]{1,20}", product_id)):
            return {"status": "unavailable", "reason": "Invalid GOG product ID"}
        digest = hashlib.sha256(("gog:" + product_id).encode("ascii")).digest()
        metadata_key = (1 << 49) + (int.from_bytes(digest[:6], "big"))
        return await asyncio.to_thread(
            self._hltb_cache_service().lookup, metadata_key, name)

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
        if _GOG_INSTALL_MODULE is not None:
            await asyncio.to_thread(_GOG_INSTALL_MODULE.stop_all)
        if hasattr(self, "_gog_phone"):
            await asyncio.to_thread(self._gog_phone.shutdown)

    async def get_installed_version(self):
        try:
            package = json.loads((BASE / "package.json").read_text(encoding="utf-8"))
            version = package.get("version")
            if not isinstance(version, str) or not re.fullmatch(r"[0-9A-Za-z][0-9A-Za-z.+-]{0,63}", version):
                raise ValueError("invalid version")
            return {"version": version}
        except (OSError, ValueError, TypeError) as exc:
            return {"version": "", "error": type(exc).__name__}

    async def get_library_tabs(self, account_id: str = ""):
        """Read self-owned tabs, scoped to the active Steam account."""
        account = _own_tab_account(account_id)
        if account is None:
            return {"ok": False, "reason": "Active Steam account unavailable",
                    "tabs": _own_tab_defaults()}
        return {"ok": True, "tabs": _own_tab_read(account)}

    async def save_library_tabs(self, account_id: str, tabs: list):
        """Persist strict validated tabs atomically without touching Steam."""
        account = _own_tab_account(account_id)
        if account is None:
            return {"ok": False, "reason": "Steam account unavailable"}
        try:
            valid = _own_tab_validate(tabs)
            saved = _read_preferences()
            profiles = saved.get("tabs_by_user", {})
            profiles = dict(profiles) if isinstance(profiles, dict) else {}
            profiles[account] = valid
            saved["tabs_by_user"] = profiles
            _write_preferences(saved)
            return {"ok": True, "tabs": valid}
        except (ValueError, OSError) as error:
            return {"ok": False, "reason": str(error)[:120]}

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
