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
        # 0.4.1: media/notes and native Internet/Wi-Fi are packaged into
        # Steam's main Game Mode tab, not the overlay/QAM stylesheet.
        self.assertIn("appdetailsnotessection_NoteLink", css["main"])
        self.assertIn("appdetailsmedialibrary_MediaLibraryButton", css["main"])
        self.assertIn("networksettings_NetworkItem", css["main"])
        self.assertIn("gamepaddropdown_DropDownControlButton", css["main"])
        self.assertIn("appdetailsplaysection_OptionsButton", css["main"])
        self.assertNotIn("appdetailsnotessection_NoteLink", css["overlay"])
        self.assertNotIn("networksettings_NetworkItem", css["overlay"])
        self.assertIn("gamepadpagedsettings_", css["main"])
        self.assertNotIn("downloads_DownloadsPage", css["overlay"])
        self.assertNotIn("quickaccessmenu_Menu", css["main"])
        for content in css.values():
            self.assertLess(len(content), 100000)
        # Both decorative inset layers must ignore pointer events, while
        # native Steam menu rows, Game Mode and the rest of QAM remain
        # interactive. Do not allow pointer-events:none on actual controls.
        import re
        self.assertNotIn("pointer-events:none", css["main"].replace(" ", ""))
        owners = [
            (selector, declarations)
            for selector, declarations in re.findall(
                r"([^{}]+)\{([^{}]*)\}", css["overlay"]
            )
            if re.search(r"pointer-events\s*:\s*none", declarations)
        ]
        self.assertEqual(len(owners), 2, "Only the inset fill/frame can ignore pointer events")
        for selector, declarations in owners:
            self.assertIn("mainmenu_Item", selector)
            self.assertTrue(
                "::before" in selector or "::after" in selector,
                "Never disable hit testing on a native Steam menu row"
            )
        self.assertEqual(
            {pseudo for pseudo in ("::before", "::after")
             if any(pseudo in selector for selector, _ in owners)},
            {"::before", "::after"},
        )
        self.assertFalse(asyncio.run(obj.get_builtin_theme("../../other"))["ok"])


if __name__ == "__main__":
    unittest.main()
