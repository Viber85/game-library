import asyncio
import os
import pathlib
import ssl
import tempfile
import unittest
import urllib.error
from unittest import mock

import main
import steamgriddb


def good_grid(url="https://cdn2.steamgriddb.com/grid/cover.png"):
    return {"data": [
        {"url": url, "width": 600, "height": 900, "upvotes": 123,
         "downvotes": 1, "nsfw": False, "humor": False, "epilepsy": False},
        {"url": "https://evil.example/cover.png", "width": 600, "height": 900,
         "upvotes": 90000},
    ]}


def good_hero():
    return {"data": [
        {"url": "https://cdn2.steamgriddb.com/hero/wide.jpg",
         "width": 1920, "height": 620, "upvotes": 24},
    ]}


class SteamGridDBTests(unittest.TestCase):
    def test_title_search_matches_exact_game_not_sequel(self):
        response = {"data": [
            {"name": "Hades II", "id": 222, "verified": True},
            {"name": "Hades", "id": 111, "verified": True},
            {"name": "Hadean Tactics", "id": 333},
        ]}
        self.assertEqual(steamgriddb.choose_game("Hades", response), 111)
        self.assertEqual(steamgriddb.choose_game("Hades II", response), 222)
        self.assertIsNone(steamgriddb.choose_game("Hades III", response))
        self.assertEqual(steamgriddb.normalize_title("Cyberpunk™ 2077"),
                         steamgriddb.normalize_title("Cyberpunk 2077"))

    def test_only_safe_static_portrait_and_wide_images(self):
        self.assertEqual(steamgriddb.choose_art(good_grid(), "cover"),
                         "https://cdn2.steamgriddb.com/grid/cover.png")
        self.assertEqual(steamgriddb.choose_art(good_hero(), "hero"),
                         "https://cdn2.steamgriddb.com/hero/wide.jpg")
        self.assertIsNone(steamgriddb.choose_art(good_hero(), "cover"))
        self.assertIsNone(steamgriddb.valid_art_url("https://steamgriddb.com.evil.test/x"))
        self.assertIsNone(steamgriddb.valid_art_url("http://cdn2.steamgriddb.com/x"))
        self.assertIsNone(steamgriddb.choose_art(
            {"data": [{**good_grid()["data"][0], "nsfw": True}]}, "cover"))

    def test_key_persisted_privately_and_never_exposed_in_settings(self):
        key = "A" * 32
        with tempfile.TemporaryDirectory() as tmp:
            self.assertFalse(steamgriddb.save_key(tmp, "not a key"))
            self.assertTrue(steamgriddb.save_key(tmp, key))
            path = steamgriddb.key_path(tmp)
            self.assertEqual(steamgriddb.read_key(tmp), key)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            with mock.patch.object(main, "_load_steamgriddb", return_value=steamgriddb), \
                 mock.patch.object(main, "_steamgriddb_config_dir", return_value=pathlib.Path(tmp)):
                settings = asyncio.run(main.Plugin().get_steamgriddb_settings())
                self.assertEqual(settings, {"enabled": True, "has_key": True})
                self.assertNotIn(key, repr(settings))
            self.assertTrue(steamgriddb.delete_key(tmp))
            self.assertIsNone(steamgriddb.read_key(tmp))

    def test_live_key_verification_and_no_invalid_credential_persistence(self):
        token = "D" * 32
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.object(main, "_load_steamgriddb", return_value=steamgriddb), \
                 mock.patch.object(main, "_steamgriddb_config_dir", return_value=pathlib.Path(tmp)), \
                 mock.patch.object(steamgriddb, "fetch_json", return_value={"success": True}):
                response = asyncio.run(main.Plugin().set_steamgriddb_key(token))
                self.assertTrue(response["ok"])
                self.assertEqual(steamgriddb.read_key(tmp), token)
            steamgriddb.delete_key(tmp)
            error = urllib.error.HTTPError("https://www.steamgriddb.com/api/v2",
                                          401, "Unauthorized", None, None)
            with mock.patch.object(main, "_load_steamgriddb", return_value=steamgriddb), \
                 mock.patch.object(main, "_steamgriddb_config_dir", return_value=pathlib.Path(tmp)), \
                 mock.patch.object(steamgriddb, "fetch_json", side_effect=error):
                response = asyncio.run(main.Plugin().set_steamgriddb_key(token))
                self.assertFalse(response["ok"])
                self.assertNotIn(token, repr(response))
                self.assertIsNone(steamgriddb.read_key(tmp))

    def test_provider_uses_decky_trust_bundle_in_real_https_opener(self):
        import ssl
        context = ssl.create_default_context()
        with mock.patch.object(steamgriddb, "_decky_ssl_context", return_value=context) as supplied:
            self.assertIs(steamgriddb._ssl_context(), context)
            supplied.assert_called_once_with()
        response = mock.MagicMock()
        response.geturl.return_value = "https://www.steamgriddb.com/api/v2/search/autocomplete/Portal"
        response.read.return_value = b'{"success":true,"data":[]}'
        opener = mock.MagicMock()
        opener.open.return_value.__enter__.return_value = response
        with mock.patch.object(steamgriddb, "_decky_ssl_context", return_value=context), \
             mock.patch.object(steamgriddb.urllib.request, "build_opener",
                               return_value=opener) as builder:
            reply = steamgriddb.fetch_json("search/autocomplete/Portal", "A"*32)
            self.assertTrue(reply["success"])
            args = builder.call_args.args
            self.assertTrue(any(isinstance(arg, steamgriddb.urllib.request.HTTPSHandler)
                                for arg in args))
            self.assertTrue(any(isinstance(arg, type) and
                                issubclass(arg, steamgriddb.urllib.request.HTTPRedirectHandler)
                                for arg in args))

    def test_key_verification_distinguishes_http_ssl_and_transport_errors(self):
        import ssl
        cases = [
            (urllib.error.HTTPError("https://www.steamgriddb.com/api/v2", 401,
                                    "Unauthorized", None, None), "invalid_key"),
            (urllib.error.HTTPError("https://www.steamgriddb.com/api/v2", 403,
                                    "Forbidden", None, None), "access_forbidden"),
            (urllib.error.HTTPError("https://www.steamgriddb.com/api/v2", 429,
                                    "Too Many Requests", None, None), "rate_limited"),
            (urllib.error.HTTPError("https://www.steamgriddb.com/api/v2", 503,
                                    "Unavailable", None, None), "provider_unavailable"),
            (urllib.error.URLError(ssl.SSLCertVerificationError(
                "CERTIFICATE_VERIFY_FAILED")), "ssl_certificate"),
            (urllib.error.URLError(TimeoutError("timed out")), "timeout"),
        ]
        for error, expected in cases:
            with self.subTest(expected=expected), \
                 mock.patch.object(steamgriddb, "fetch_json", side_effect=error):
                with self.assertRaises(steamgriddb.KeyVerificationError) as reported:
                    steamgriddb.verify_key("D" * 32)
                self.assertEqual(reported.exception.code, expected)
                self.assertNotIn("D"*32, str(reported.exception))
        with mock.patch.object(steamgriddb, "fetch_json",
                               return_value={"success":False,"errors":["Invalid API key"]}):
            with self.assertRaises(steamgriddb.KeyVerificationError) as reported:
                steamgriddb.verify_key("D" * 32)
            self.assertEqual(reported.exception.code, "invalid_key")

    def test_decky_backend_error_contains_actionable_code_without_secret(self):
        error = urllib.error.URLError(ssl.SSLCertVerificationError(
            "CERTIFICATE_VERIFY_FAILED"))
        with tempfile.TemporaryDirectory() as tmp, \
             mock.patch.object(main, "_load_steamgriddb", return_value=steamgriddb), \
             mock.patch.object(main, "_steamgriddb_config_dir",
                               return_value=pathlib.Path(tmp)), \
             mock.patch.object(steamgriddb, "fetch_json", side_effect=error):
            result = asyncio.run(main.Plugin().set_steamgriddb_key("D" * 32))
            self.assertFalse(result["ok"])
            self.assertEqual(result["code"], "ssl_certificate")
            self.assertIn("certificate", result["reason"].lower())
            self.assertNotIn("D"*32, repr(result))
            self.assertIsNone(steamgriddb.read_key(tmp))

    def test_positive_and_negative_results_cached_without_requery(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = steamgriddb.ArtworkService(pathlib.Path(tmp) / "cache.json")
            with mock.patch.object(steamgriddb, "fetch_json", side_effect=[
                {"data": [{"name": "Portal 2", "id": 9, "verified": True}]},
                good_grid(),
                good_hero(),
            ]) as fetch:
                result = service.lookup("Portal 2", "B" * 32)
                again = service.lookup("Portal 2", "B" * 32)
                self.assertEqual(result["status"], "ok")
                self.assertIsNotNone(result["cover"])
                self.assertIsNotNone(result["hero"])
                self.assertTrue(again["cached"])
                self.assertEqual(fetch.call_count, 3)
                paths = [x.args[0] for x in fetch.call_args_list]
                self.assertTrue(paths[0].startswith("search/autocomplete/Portal%202"))
                self.assertTrue(paths[1].startswith("grids/game/9?"))
                self.assertTrue(paths[2].startswith("heroes/game/9?"))
            self.assertTrue(steamgriddb.ArtworkService(service.path).lookup(
                "Portal 2", "B" * 32)["cached"])
            with mock.patch.object(steamgriddb, "fetch_json",
                                   return_value={"data": [{"name": "Wrong game", "id": 8}]}) as fetch:
                first = service.lookup("Unique Unmatched Game", "B" * 32)
                second = service.lookup("Unique Unmatched Game", "B" * 32)
                self.assertEqual(first["status"], "no_match")
                self.assertTrue(second["cached"])
                fetch.assert_called_once()

    def test_network_and_invalid_key_are_not_cached_or_leaked(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = steamgriddb.ArtworkService(pathlib.Path(tmp) / "cache.json")
            err = urllib.error.HTTPError("https://www.steamgriddb.com/api/v2",
                                         401, "Unauthorized", None, None)
            with mock.patch.object(steamgriddb, "fetch_json", side_effect=err):
                result = service.lookup("Portal 2", "C" * 32)
                self.assertEqual(result["status"], "unauthorized")
                self.assertEqual(service.entries, {})
            self.assertEqual(service.lookup("Portal 2", "bad")["status"], "invalid")

    def test_backend_only_queries_real_steam_and_enabled_key(self):
        with tempfile.TemporaryDirectory() as tmp:
            key = "A" * 32
            steamgriddb.save_key(tmp, key)
            plugin = main.Plugin()
            with mock.patch.object(main, "_load_steamgriddb", return_value=steamgriddb), \
                 mock.patch.object(main, "_steamgriddb_config_dir", return_value=pathlib.Path(tmp)), \
                 mock.patch.object(main, "_steamgriddb_cache_path",
                                   return_value=pathlib.Path(tmp) / "cached.json"), \
                 mock.patch.object(main, "_read_preferences", return_value={"steamgriddb_enabled": True}), \
                 mock.patch.object(steamgriddb, "fetch_json", side_effect=[
                     {"data": [{"name": "Portal 2", "id": 9}]}, good_grid(), good_hero()
                 ]) as fetch:
                result = asyncio.run(plugin.steamgriddb_art(620, "Portal 2", False))
                self.assertEqual(result["status"], "ok")
                self.assertNotIn(key, repr(result))
                self.assertEqual(fetch.call_count, 3)
                rejected = asyncio.run(plugin.steamgriddb_art(620, "Portal 2", True))
                self.assertEqual(rejected["status"], "invalid")
                self.assertEqual(fetch.call_count, 3)

    def test_disabled_setting_never_contacts_provider(self):
        with mock.patch.object(main, "_read_preferences",
                               return_value={"steamgriddb_enabled": False}), \
             mock.patch.object(main, "_load_steamgriddb") as provider:
            result = asyncio.run(main.Plugin().steamgriddb_art(620, "Portal 2", False))
            self.assertEqual(result["status"], "disabled")
            provider.assert_not_called()


if __name__ == "__main__":
    unittest.main()
