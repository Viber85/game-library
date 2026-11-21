"""Offline regression tests for Game Library's independent GOG provider."""
import importlib.util
import json
import os
import pathlib
import tempfile
import time
import unittest
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("game_library_own_gog_test", ROOT / "gog.py")
gog = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gog)


class GogPhaseOneTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = mock.patch.dict(os.environ, {"DECKY_PLUGIN_SETTINGS_DIR": self.temp.name})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.temp.cleanup()

    def test_rejects_redirect_from_other_hosts(self):
        with self.assertRaises(gog.GogError):
            gog._authorization_code("https://evil.example/on_login_success?code=abcdefghijklmnop")
        with self.assertRaises(gog.GogError):
            gog._authorization_code("not-a-token")
        self.assertEqual(
            gog._authorization_code("https://embed.gog.com/on_login_success?origin=client&code=abcdefghijklmnop"),
            "abcdefghijklmnop",
        )

    def test_different_steam_accounts_never_share_gog_data(self):
        gog._atomic_json(gog._folder("1234") / "session.json",
                         {"access": "abc", "refresh": "def", "expires_at": time.time() + 2000})
        self.assertTrue(gog.status("1234")["connected"])
        self.assertFalse(gog.status("5678")["connected"])
        if os.name != "nt":
            self.assertEqual((gog._folder("1234") / "session.json").stat().st_mode & 0o777, 0o600)
        self.assertTrue(gog.disconnect("1234")["ok"])
        self.assertFalse(gog.status("1234")["connected"])

    def test_paginated_owned_products_and_cache(self):
        gog._atomic_json(gog._folder("42") / "session.json",
                         {"access": "abc", "refresh": "def", "expires_at": time.time() + 2000})
        pages = {
            1: {"totalPages": 2, "products": [
                {"id": 111, "title": "Zelda Test", "image": "//images-1.gog.com/test"},
                {"id": 222, "title": "Alpha Game", "image": "https://evil.example/image"}]},
            2: {"totalPages": 2, "products": [
                {"id": 111, "title": "duplicate"},
                {"id": 333, "title": "Beta Game"}]},
        }

        def fake_http(url, access=None):
            page = int(url.rsplit("page=", 1)[1])
            self.assertEqual(access, "abc")
            return pages[page]

        with mock.patch.object(gog, "_http_json", side_effect=fake_http):
            reply = gog.sync("42")
        self.assertTrue(reply["ok"])
        self.assertEqual(reply["count"], 3)
        result = gog.library("42")
        self.assertEqual([x["title"] for x in result["games"]],
                         ["Alpha Game", "Beta Game", "Zelda Test"])
        self.assertEqual(result["games"][0]["image"], "")
        self.assertEqual(result["games"][2]["image"], "https://images-1.gog.com/test")

    def test_failed_sync_preserves_previous_complete_cache(self):
        gog._atomic_json(gog._folder("42") / "session.json",
                         {"access": "abc", "refresh": "def", "expires_at": time.time() + 2000})
        old = {"games": [{"id": "1", "title": "Saved", "image": "", "background": ""}],
               "synced_at": 101}
        gog._atomic_json(gog._folder("42") / "library.json", old)
        with mock.patch.object(gog, "_http_json", side_effect=gog.GogError("Offline")):
            reply = gog.sync("42")
        self.assertFalse(reply["ok"])
        self.assertEqual(gog.library("42")["games"], old["games"])
        self.assertEqual(gog.library("42")["synced_at"], 101)

    def test_no_foreign_plugin_or_steam_folder_lookup(self):
        src = (ROOT / "gog.py").read_text(encoding="utf-8")
        self.assertNotIn("~/.config/unifideck", src.lower())
        self.assertNotIn("shortcuts.vdf", src.lower())
        self.assertNotIn("gogdl_credentials.json", src.lower())


if __name__ == "__main__":
    unittest.main()
