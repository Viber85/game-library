import asyncio
import os
import tempfile
import unittest
from unittest import mock

import main
from main import Plugin


class NativeSteamDetailsRollbackTests(unittest.TestCase):
    def test_experimental_compact_cannot_be_reenabled_and_legacy_setting_can_be_cleared(self):
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.dict(os.environ, {"DECKY_PLUGIN_SETTINGS_DIR": tmp}):
                obj = Plugin()
                self.assertTrue(asyncio.run(obj.set_theme_settings("midnight")))
                self.assertFalse(asyncio.run(obj.set_compact_details(True)))
                self.assertFalse(asyncio.run(obj.set_compact_details(1)))
                self.assertFalse(asyncio.run(obj.get_theme_settings())["compact_details"])
                # Simulate an existing user setting from test.18/19.
                previous = main._read_preferences()
                previous["compact_details"] = True
                main._write_preferences(previous)
                self.assertFalse(asyncio.run(obj.get_theme_settings())["compact_details"])
                self.assertTrue(asyncio.run(obj.set_compact_details(False)))
                saved = main._read_preferences()
                self.assertIs(saved["compact_details"], False)
                self.assertEqual(saved["theme_id"], "midnight")

    def test_precompact_midnight_theme_is_preserved_without_opt_in_css(self):
        theme = main._builtin_theme_bundle("midnight")
        self.assertEqual(theme["name"], "Midnight")
        self.assertNotIn("compact_css", theme)
        main_css = theme["css"]["main"]
        overlay_css = theme["css"]["overlay"]
        # Longstanding pre-Compact Midnight game page styling is preserved.
        self.assertIn("appdetailsplaysection_PlayBar", main_css)
        self.assertIn("sharedappdetailsheader_TopGradient", main_css)
        self.assertIn("game-details-midnight.css",
                      (main.BASE / "main.py").read_text(encoding="utf-8"))
        self.assertNotIn("--glm-compact-details-effective", main_css)
        self.assertNotIn("data-glm-native-compact", main_css)
        self.assertNotIn("--glm-compact-poster-url", overlay_css)
        self.assertNotIn("data-glm-native-compact", overlay_css)


if __name__ == "__main__":
    unittest.main()
