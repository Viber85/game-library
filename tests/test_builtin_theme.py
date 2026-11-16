import asyncio
import pathlib
import tempfile
import unittest
from unittest import mock

import main

ROOT = pathlib.Path(__file__).resolve().parents[1]


class BuiltInThemeTests(unittest.TestCase):
    def test_midnight_is_default_on_existing_and_new_installations(self):
        with tempfile.TemporaryDirectory() as tmp:
            settings = pathlib.Path(tmp) / "preferences.json"
            with mock.patch.object(main, "_settings_path", return_value=settings):
                obj = main.Plugin()
                self.assertEqual(
                    asyncio.run(obj.get_theme_settings())["theme_id"], "midnight"
                )
                self.assertTrue(asyncio.run(obj.set_theme_settings("off")))
                self.assertEqual(
                    asyncio.run(obj.get_theme_settings())["theme_id"], "off"
                )
                self.assertTrue(asyncio.run(obj.set_theme_settings("midnight")))
                self.assertEqual(
                    asyncio.run(obj.get_theme_settings())["theme_id"], "midnight"
                )

    def test_theme_and_home_settings_do_not_erase_one_another(self):
        with tempfile.TemporaryDirectory() as tmp:
            settings = pathlib.Path(tmp) / "preferences.json"
            with mock.patch.object(main, "_settings_path", return_value=settings):
                obj = main.Plugin()
                self.assertTrue(asyncio.run(obj.set_dashboard_settings(False)))
                self.assertTrue(asyncio.run(obj.set_theme_settings("off")))
                self.assertEqual(
                    asyncio.run(obj.get_dashboard_settings())["default_home"], False
                )
                self.assertTrue(asyncio.run(obj.set_theme_settings("midnight")))
                self.assertEqual(
                    asyncio.run(obj.get_dashboard_settings())["default_home"], False
                )
                self.assertTrue(asyncio.run(obj.set_dashboard_settings(True)))
                self.assertEqual(
                    asyncio.run(obj.get_theme_settings())["theme_id"], "midnight"
                )
                self.assertFalse(asyncio.run(obj.set_theme_settings("../other")))
                self.assertEqual(
                    asyncio.run(obj.get_theme_settings())["theme_id"], "midnight"
                )

    def test_main_and_overlay_use_correct_bundled_styles(self):
        obj = main.Plugin()
        data = asyncio.run(obj.get_builtin_theme("midnight"))
        self.assertTrue(data["ok"], data)
        css = data["css"]
        self.assertIn("--glm-accent: #4ac1ff", css["main"])
        self.assertIn("--glm-accent: #4ac1ff", css["overlay"])
        self.assertIn("#MainNavMenuContainer", css["overlay"])
        self.assertIn("#QuickAccess-Menu", css["overlay"])
        self.assertIn("downloads_DownloadsPage", css["main"])
        self.assertIn("gamepadpagedsettings_PagedSettingsDialog_PageListColumn", css["main"])
        self.assertIn("gamepadpagedsettings_PagedSettingsDialog_PageContent", css["main"])
        self.assertIn("appdetailsoverview_ColumnContainer", css["main"])
        self.assertIn("appdetailsplaysection_PlayBar", css["main"])
        self.assertIn("appdetailsactivitysection_ActivityFeedContainer", css["main"])
        self.assertIn("gamepadpagedsettings_", css["main"])
        self.assertNotIn("downloads_DownloadsPage", css["overlay"])
        self.assertNotIn("quickaccessmenu_Menu", css["main"])
        for content in css.values():
            self.assertLess(len(content), 100000)
            self.assertNotIn("pointer-events:none", content.replace(" ", ""))
        self.assertFalse(asyncio.run(obj.get_builtin_theme("../../other"))["ok"])


if __name__ == "__main__":
    unittest.main()
