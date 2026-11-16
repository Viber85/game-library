import asyncio
import importlib.util
import json
import pathlib
import tempfile
import unittest
from unittest import mock

import main

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("game_library_test_system_theme", str(ROOT / "system_theme.py"))
assert spec and spec.loader
system_theme = importlib.util.module_from_spec(spec)
spec.loader.exec_module(system_theme)


class CSSLoaderThemeTests(unittest.TestCase):
    def test_theme_targets_main_menu_qam_settings_downloads(self):
        source = ROOT / "system-theme"
        manifest = json.loads((source / "theme.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["manifest_version"], 8)
        self.assertEqual(manifest["target"], "System-Wide")
        self.assertEqual(manifest["name"], "Game Library Midnight")
        self.assertEqual(manifest["author"], "Viber85")
        self.assertIn("bigpicture", manifest["inject"]["settings.css"])
        self.assertIn("bigpicture", manifest["inject"]["downloads.css"])
        self.assertIn("bigpictureoverlay", manifest["inject"]["menus.css"])
        self.assertIn("bigpictureoverlay", manifest["inject"]["qam.css"])
        self.assertEqual(set(manifest["inject"]), set(system_theme.FILES) - {"theme.json"})
        for css in manifest["inject"]:
            contents = (source / css).read_text(encoding="utf-8")
            self.assertTrue(contents.strip(), css)
            self.assertNotIn("display:none", contents.replace(" ", ""), css)
            self.assertNotIn("pointer-events:none", contents.replace(" ", ""), css)
            self.assertNotIn("* {color:", contents.replace(" ", ""), css)

    def test_install_update_remove_own_theme_preserves_others(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp) / "themes"
            other = root / "Someone Else"
            other.mkdir(parents=True)
            (other / "theme.json").write_text('{"name":"Someone Else"}')
            tool = system_theme.ThemeInstaller(ROOT, root)
            self.assertFalse(tool.status()["installed"])
            first = tool.install()
            self.assertTrue(first["ok"], first)
            self.assertTrue(first["installed"])
            self.assertTrue(tool.status()["installed"])
            css = tool.destination / "shared.css"
            self.assertIn("--glm-accent: #4ac1ff", css.read_text())
            css.write_text("old CSS")
            second = tool.install()
            self.assertTrue(second["ok"], second)
            self.assertIn("--glm-accent: #4ac1ff", css.read_text())
            result = tool.remove()
            self.assertTrue(result["ok"], result)
            self.assertFalse(tool.destination.exists())
            self.assertTrue((other / "theme.json").exists())

    def test_refuses_overwriting_foreign_theme(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp) / "themes"
            occupied = root / system_theme.NAME
            occupied.mkdir(parents=True)
            f = occupied / "theme.json"
            f.write_text('{"name":"Custom user theme","author":"Someone Else"}')
            tool = system_theme.ThemeInstaller(ROOT, root)
            result = tool.install()
            self.assertFalse(result["ok"])
            self.assertEqual(f.read_text(), '{"name":"Custom user theme","author":"Someone Else"}')
            self.assertFalse(tool.remove()["ok"])

    def test_refuses_removing_other_content_and_symlinks(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp) / "themes"
            tool = system_theme.ThemeInstaller(ROOT, root)
            self.assertTrue(tool.install()["ok"])
            extra = tool.destination / "user-notes.txt"
            extra.write_text("keep this")
            self.assertFalse(tool.remove()["ok"])
            self.assertTrue(extra.is_file())
            extra.unlink()
            foreign = pathlib.Path(tmp) / "other"
            foreign.mkdir()
            shortcut = tool.destination / "shared.css"
            shortcut.unlink()
            shortcut.symlink_to(foreign / "global.css")
            self.assertFalse(tool.install()["ok"])
            self.assertFalse(tool.remove()["ok"])
            self.assertFalse((foreign / "global.css").exists())

    def test_matches_cssloader_decky_home_and_backend_rpc(self):
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.dict("os.environ", {"DECKY_HOME": tmp}):
                self.assertEqual(system_theme._css_loader_themes_dir(),
                                 pathlib.Path(tmp) / "themes")
                p = main.Plugin()
                installed = asyncio.run(p.install_system_theme())
                self.assertTrue(installed["ok"], installed)
                status = asyncio.run(p.system_theme_status())
                self.assertTrue(status["installed"])
                removed = asyncio.run(p.remove_system_theme())
                self.assertTrue(removed["ok"])


if __name__ == "__main__":
    unittest.main()
