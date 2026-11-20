"""Focused regression tests for persisted manual Backlog and Completed."""
import asyncio
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

MAIN = Path(__file__).resolve().parents[1] / "main.py"
spec = importlib.util.spec_from_file_location("game_library_test_plugin", MAIN)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ManualCollectionsTest(unittest.TestCase):
    def setUp(self):
        self.original = os.environ.get("DECKY_PLUGIN_SETTINGS_DIR")
        self.folder = tempfile.TemporaryDirectory()
        os.environ["DECKY_PLUGIN_SETTINGS_DIR"] = self.folder.name
        self.plugin = module.Plugin()

    def tearDown(self):
        if self.original is None:
            os.environ.pop("DECKY_PLUGIN_SETTINGS_DIR", None)
        else:
            os.environ["DECKY_PLUGIN_SETTINGS_DIR"] = self.original
        self.folder.cleanup()

    def run_async(self, method, *args):
        return asyncio.run(getattr(self.plugin, method)(*args))

    def test_empty_then_persisted_and_mutually_exclusive(self):
        self.assertEqual(self.run_async("get_manual_collections")["collections"],
                         {"backlog": [], "completed": []})
        result = self.run_async("set_manual_collection", "backlog", 42, True)
        self.assertTrue(result["ok"])
        self.assertEqual(result["collections"]["backlog"], [42])
        # Completed moves the game, never leaves a duplicate in Backlog.
        result = self.run_async("set_manual_collection", "completed", 42, True)
        self.assertEqual(result["collections"],
                         {"backlog": [], "completed": [42]})
        # Different Plugin instance sees the persisted state.
        self.assertEqual(
            asyncio.run(module.Plugin().get_manual_collections())["collections"],
            {"backlog": [], "completed": [42]})
        result = self.run_async("set_manual_collection", "completed", 42, False)
        self.assertEqual(result["collections"]["completed"], [])

    def test_invalid_inputs_do_not_change_saved_state(self):
        for section, appid, included in (
            ("continue", 42, True), ("backlog", True, True),
            ("backlog", -3, True), ("backlog", 9007199254740992, True),
            ("completed", 42, 1), ("completed", "42", True),
        ):
            self.assertFalse(
                self.run_async("set_manual_collection", section, appid, included)["ok"])
        self.assertEqual(self.run_async("get_manual_collections")["collections"],
                         {"backlog": [], "completed": []})

    def test_keeps_theme_preferences_and_sanitizes_corrupt_membership(self):
        self.run_async("set_theme_settings", "off")
        path = Path(self.folder.name) / "game_library.json"
        prefs = json.loads(path.read_text())
        prefs["manual_collections"] = {
            "backlog": [5, 5, False, "6", 3],
            "completed": [5, 9, -1, 0],
        }
        path.write_text(json.dumps(prefs))
        self.assertEqual(self.run_async("get_manual_collections")["collections"],
                         {"backlog": [3], "completed": [5, 9]})
        self.run_async("set_manual_collection", "backlog", 8, True)
        self.assertEqual(json.loads(path.read_text())["theme_id"], "off")


if __name__ == "__main__":
    unittest.main()
