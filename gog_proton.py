"""Read-only discovery of locally installed Steam compatibility tools.

Steam clients from October 2026 may have SpecifyCompatTool while removing
Apps.GetAvailableCompatTools and Settings.GetGlobalCompatTools. This scanner
only reads verified Proton installations (Valve depots and custom VDFs).
It never edits Steam's config.vdf, shortcuts.vdf, installs or Proton prefixes.
"""
import pathlib
import re

_TOOL_NAME = re.compile(r"^[A-Za-z0-9_.-]{1,100}$")
_VALVE_PROTON = re.compile(r"^Proton[ -]+([0-9]{1,2})(?:[.]0)?$")
_VDF_TOOL = re.compile(r'"compat_tools"\s*\{\s*"([^"]{1,128})"\s*\{', re.I | re.S)
_MAX_FILES = 48
_MAX_VDF = 65536


def _steam_roots(home):
    roots = [
        home / ".local" / "share" / "Steam",
        home / ".steam" / "root",
        home / ".steam" / "steam",
        home / ".var" / "app" / "com.valvesoftware.Steam" / "data" / "Steam",
    ]
    seen = set()
    for root in roots:
        try:
            canonical = root.resolve(strict=True)
        except (OSError, RuntimeError):
            continue
        if not canonical.is_dir() or canonical in seen:
            continue
        seen.add(canonical)
        yield canonical


def _valid_dir(path):
    # Valve's own depots ship a launcher named proton (and a toolmanifest).
    # Avoid returning a tool based only on an empty directory's name.
    return (path.is_dir() and
            (path / "proton").is_file() and
            (path / "toolmanifest.vdf").is_file())


def _valve_name(name):
    name_lower = name.lower()
    if name_lower in ("proton - experimental", "proton experimental"):
        return "proton_experimental"
    if name_lower in ("proton - hotfix", "proton hotfix"):
        return "proton_hotfix"
    match = _VALVE_PROTON.fullmatch(name)
    if match:
        return "proton_" + str(int(match.group(1)))
    return None


def _custom_tool_name(path):
    vdf = path / "compatibilitytool.vdf"
    if not vdf.is_file() or vdf.is_symlink():
        return None
    try:
        if vdf.stat().st_size > _MAX_VDF:
            return None
        content = vdf.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return None
    # Comments may precede the inner compat_tools block. Its key (NOT the
    # optional internal_name property) is the ID accepted by Steam.
    content = re.sub(r"(?m)^\s*//[^\n]*", "", content)
    match = _VDF_TOOL.search(content)
    if not match:
        return None
    tool = match.group(1)
    if not _TOOL_NAME.fullmatch(tool):
        return None
    if "proton" not in (tool + " " + path.name).lower():
        return None
    return tool


def discover(installer):
    """Return Steam's verified local tool IDs, without exposing user paths."""
    try:
        home, _user = installer._home()
        home = pathlib.Path(home)
        tools = []
        seen = set()

        def add(tool, title, source):
            if tool and tool not in seen and _TOOL_NAME.fullmatch(tool):
                seen.add(tool)
                tools.append({
                    "strToolName": tool,
                    "strDisplayName": title,
                    "source": source,
                })

        for steam_root in _steam_roots(home):
            common = steam_root / "steamapps" / "common"
            if common.is_dir():
                for path in sorted(common.iterdir(), key=lambda p:p.name.lower())[:_MAX_FILES]:
                    name = _valve_name(path.name)
                    if name and _valid_dir(path):
                        add(name, path.name, "valve")
            custom = steam_root / "compatibilitytools.d"
            if custom.is_dir():
                for path in sorted(custom.iterdir(), key=lambda p:p.name.lower())[:_MAX_FILES]:
                    if not path.is_dir():
                        continue
                    name = _custom_tool_name(path)
                    if name and (path / "proton").is_file():
                        add(name, path.name, "custom")

        return {"ok": True, "tools": tools[:48]}
    except (OSError, RuntimeError, ValueError) as error:
        return {"ok": False, "tools": [], "reason": type(error).__name__}
