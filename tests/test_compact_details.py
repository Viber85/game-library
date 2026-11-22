import asyncio
import json
import os
import pathlib
import tempfile
import unittest
from unittest import mock

import main
from main import Plugin


class CompactDetailsSettingsTests(unittest.TestCase):
    def test_default_off_and_saved_toggle_preserve_other_settings(self):
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.dict(os.environ, {"DECKY_PLUGIN_SETTINGS_DIR": tmp}):
                current = asyncio.run(Plugin().get_theme_settings())
                self.assertEqual(current["theme_id"], "midnight")
                self.assertFalse(current["compact_details"])
                self.assertFalse(asyncio.run(Plugin().set_compact_details(1)))
                self.assertFalse(asyncio.run(Plugin().set_compact_details("yes")))
                self.assertTrue(asyncio.run(Plugin().set_theme_settings("midnight")))
                self.assertTrue(asyncio.run(Plugin().set_compact_details(True)))
                saved = main._read_preferences()
                self.assertTrue(saved["compact_details"])
                self.assertEqual(saved["theme_id"], "midnight")
                self.assertTrue(asyncio.run(Plugin().get_theme_settings())["compact_details"])
                self.assertTrue(asyncio.run(Plugin().set_compact_details(False)))
                saved = main._read_preferences()
                self.assertFalse(saved["compact_details"])
                self.assertEqual(saved["theme_id"], "midnight")

    def test_compact_css_is_a_separate_bundle_never_enabled_by_default(self):
        theme = main._builtin_theme_bundle("midnight")
        self.assertIn("compact_css", theme)
        self.assertIn("sharedappdetailsheader_TopCapsule", theme["compact_css"])
        self.assertIn("--glm-compact-details-effective:1", theme["compact_css"])
        self.assertNotIn("game-details-compact.css", theme["css"]["main"])
        self.assertNotIn("data-glm-compact-details", theme["css"]["overlay"])
        self.assertLess(len(theme["compact_css"].encode("utf-8")), 100_000)

    def test_bundle_rejects_missing_optional_stylesheet(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            with mock.patch.object(main, "BASE", root):
                with self.assertRaises(OSError):
                    main._builtin_theme_bundle("midnight")


if __name__ == "__main__":
    unittest.main()
