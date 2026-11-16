"""Install the Game Library Midnight CSS Loader theme into Decky's theme directory.

This is deliberately separate from the React plugin's dashboard CSS.
CSS Loader injects into Steam's main/overlay browser contexts (Steam Menu,
QAM, Settings, Downloads) which Decky plugin components do not all share.

No CSS Loader settings or other themes are modified. Activating the installed
theme and refreshing CSS Loader remains an explicit user action.
"""
import json
import os
from pathlib import Path

NAME = "Game Library Midnight"
FILES = (
    "theme.json",
    "shared.css",
    "buttons.css",
    "menus.css",
    "qam.css",
    "settings.css",
    "downloads.css",
    "dialogs.css",
)


def _css_loader_themes_dir():
    # Match DeckThemes/SDH-CssLoader css_utils.py:
    # DECKY_HOME = os.getenv("DECKY_HOME", os.path.join(HOME, "homebrew"))
    # get_theme_path() == os.path.join(DECKY_HOME, "themes")
    decky_home = os.environ.get("DECKY_HOME")
    if not decky_home:
        home = os.environ.get("HOME") or str(Path.home())
        decky_home = str(Path(home) / "homebrew")
    return Path(decky_home).expanduser() / "themes"


class ThemeInstaller:
    def __init__(self, plugin_base: Path, themes_dir=None):
        self.source = Path(plugin_base) / "system-theme"
        self.themes_dir = Path(themes_dir) if themes_dir is not None else _css_loader_themes_dir()
        self.destination = self.themes_dir / NAME

    def _valid_our_theme(self, folder):
        manifest = folder / "theme.json"
        if not manifest.is_file() or manifest.is_symlink() or manifest.stat().st_size > 32000:
            return False
        try:
            data = json.loads(manifest.read_text(encoding="utf-8"))
            return data.get("name") == NAME and data.get("author") == "Viber85"
        except (OSError, ValueError, TypeError):
            return False

    def _files_valid(self):
        if not self.source.is_dir() or self.source.is_symlink():
            return False
        if not self._valid_our_theme(self.source):
            return False
        return all((self.source / file).is_file() and
                   not (self.source / file).is_symlink() and
                   0 < (self.source / file).stat().st_size <= 200000
                   for file in FILES)

    def status(self):
        try:
            installed = (self.destination.is_dir() and
                         not self.destination.is_symlink() and
                         self._valid_our_theme(self.destination))
        except OSError:
            installed = False
        return {
            "ok": True, "installed": installed,
            "theme_name": NAME,
            "themes_dir": str(self.themes_dir),
            "message": "Theme installed; enable it in Decky CSS Loader." if installed
                       else "Theme not installed.",
        }

    def install(self):
        try:
            if not self._files_valid():
                return {"ok": False, "installed": False,
                        "error": "Theme files are missing from the plugin ZIP."}
            if self.themes_dir.is_symlink() or self.destination.is_symlink():
                return {"ok": False, "installed": False,
                        "error": "Refusing to write through a symbolic link."}
            if self.destination.exists() and not self._valid_our_theme(self.destination):
                return {"ok": False, "installed": False,
                        "error": "A different theme occupies this folder; not overwriting."}
            self.themes_dir.mkdir(parents=True, exist_ok=True)
            self.destination.mkdir(exist_ok=True)
            for file in FILES:
                original = self.source / file
                dest = self.destination / file
                if dest.is_symlink():
                    return {"ok": False, "installed": False,
                            "error": "Refusing to overwrite a symlink: " + file}
                data = original.read_bytes()
                # Each file is replaced atomically to avoid partial CSS when refreshed.
                temporary = self.destination / ("." + file + ".tmp")
                if temporary.is_symlink():
                    return {"ok": False, "installed": False,
                            "error": "Refusing to overwrite a symlink: " + temporary.name}
                temporary.write_bytes(data)
                os.replace(temporary, dest)
            return {"ok": True, "installed": True, "theme_name": NAME,
                    "message": "Installed. Open CSS Loader, refresh themes, then enable Game Library Midnight."}
        except OSError as error:
            return {"ok": False, "installed": False,
                    "error": "Theme installation failed: " + type(error).__name__}

    def remove(self):
        try:
            if self.destination.is_symlink() or not self.destination.is_dir():
                return {"ok": False, "installed": False,
                        "error": "No managed Game Library Midnight folder found."}
            if not self._valid_our_theme(self.destination):
                return {"ok": False, "installed": False,
                        "error": "Theme ownership could not be verified; refusing removal."}
            actual = {entry.name for entry in self.destination.iterdir()}
            unexpected = actual - set(FILES)
            if unexpected:
                return {"ok": False, "installed": True,
                        "error": "Theme contains additional files; not deleting user content."}
            for file in FILES:
                target = self.destination / file
                if target.is_symlink():
                    return {"ok": False, "installed": True,
                            "error": "Refusing removal through a symlink."}
            for file in FILES:
                target = self.destination / file
                if target.exists():
                    target.unlink()
            self.destination.rmdir()
            return {"ok": True, "installed": False,
                    "message": "Theme files removed. Refresh CSS Loader to restore original Steam colors."}
        except OSError as error:
            return {"ok": False, "installed": True,
                    "error": "Unable to remove theme: " + type(error).__name__}
