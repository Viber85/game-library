"""Offline tests for Steam Store requirement estimation; never fetch live Steam."""
import asyncio
import json
import pathlib
import tempfile
import unittest
import urllib.error
from unittest import mock

import main
import steam_size


def response(appid=123, minimum="<strong>Storage:</strong> 70 GB available space",
             recommended="<strong>Storage:</strong> 100 GB available space"):
    return {str(appid): {"success": True, "data": {
        "name": "Test Game",
        "pc_requirements": {"minimum": minimum, "recommended": recommended},
        "linux_requirements": {"minimum": "<strong>Storage:</strong> 55 GB"},
    }}}


class SteamSizeTests(unittest.TestCase):
    def test_storage_parser_ignores_memory_and_unlabeled_numbers(self):
        html = ("<strong>Memory:</strong> 16 GB RAM<br>"
                "<strong>VRAM:</strong> 8 GB<br>"
                "<strong>Storage:</strong> 70 GB available space")
        self.assertEqual(steam_size.parse_required_gb(html), 70)
        self.assertIsNone(steam_size.parse_required_gb(
            "<strong>Memory:</strong> 32 GB RAM<br>DirectX: 12"))
        self.assertEqual(steam_size.parse_required_gb(
            "<li>Hard Drive: 2.5 TB available space</li>"), 2500)
        self.assertEqual(steam_size.parse_required_gb("Storage: 1,5 GiB"),
                         round(1.5 * 1024**3 / 1_000_000_000, 2))
        self.assertEqual(steam_size.parse_required_gb(
            "<strong>Storage:</strong> 500 MB available"), .5)
        self.assertIsNone(steam_size.parse_required_gb("Storage: 50000 TB"))
        self.assertIsNone(steam_size.parse_required_gb(None))

    def test_windows_minimum_precedes_recommended_and_linux(self):
        result = steam_size.parse_store_response(response(), 123)
        self.assertEqual(result, {
            "status": "estimated", "estimated_gb": 70,
            "platform": "pc", "requirement": "minimum", "source": "steam_store"
        })
        recommended = response(minimum="CPU: 4 cores")
        found = steam_size.parse_store_response(recommended, 123)
        self.assertEqual(found["estimated_gb"], 100)
        self.assertEqual(found["requirement"], "recommended")
        linux = response()
        del linux["123"]["data"]["pc_requirements"]
        self.assertEqual(steam_size.parse_store_response(linux, 123)["platform"], "linux")
        self.assertIsNone(steam_size.parse_store_response({"123": {"success": False}}, 123))
        self.assertIsNone(steam_size.parse_store_response(response(), 456))

    def test_reject_invalid_ids_without_network_or_cache_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = steam_size.SteamSizeService(pathlib.Path(tmp) / "size.json")
            with mock.patch.object(steam_size, "fetch_store_requirements") as fetch:
                for invalid in [0, -1, 2**32, "123", True]:
                    self.assertEqual(service.lookup(invalid), {"status": "invalid"})
                fetch.assert_not_called()
            self.assertEqual(service.cached_bulk([0, 4])["entries"], [])

    def test_positive_and_negative_cache_persist_across_restart(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = pathlib.Path(tmp) / "size.json"
            service = steam_size.SteamSizeService(path)
            with mock.patch.object(steam_size, "fetch_store_requirements",
                                   return_value=response()) as fetch:
                first = service.lookup(123)
                second = service.lookup(123)
                self.assertEqual(first["status"], "estimated")
                self.assertFalse(first["cached"])
                self.assertEqual(second["estimated_gb"], 70)
                self.assertTrue(second["cached"])
                fetch.assert_called_once_with(123)
            again = steam_size.SteamSizeService(path)
            with mock.patch.object(steam_size, "fetch_store_requirements") as fetch:
                self.assertEqual(again.lookup(123)["estimated_gb"], 70)
                fetch.assert_not_called()
            self.assertEqual(again.cached_bulk([123, 234])["entries"][0]["appid"], 123)
            again.next_allowed = 0
            with mock.patch.object(steam_size, "fetch_store_requirements",
                                   return_value={"234": {"success": False}}) as fetch:
                self.assertEqual(again.lookup(234)["status"], "unavailable")
                self.assertEqual(again.lookup(234)["status"], "unavailable")
                fetch.assert_called_once()
            saved=json.loads(path.read_text(encoding="utf-8"))
            self.assertIn("123", saved["entries"])
            self.assertIn("234", saved["entries"])

    def test_throttles_focused_lookup_without_queueing_many_requests(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = steam_size.SteamSizeService(pathlib.Path(tmp) / "cache.json")
            with mock.patch.object(steam_size, "fetch_store_requirements",
                                   return_value=response()):
                self.assertEqual(service.lookup(123)["status"], "estimated")
                deferred = service.lookup(234)
                self.assertEqual(deferred["status"], "deferred")
                self.assertGreater(deferred["retry_after"], 0)
                self.assertNotIn("234", service.entries)

    def test_rate_limit_prevents_immediate_repeat(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = steam_size.SteamSizeService(pathlib.Path(tmp) / "cache.json")
            failure = urllib.error.HTTPError("https://store.steampowered.com", 429,
                                             "Limit", {"Retry-After": "1200"}, None)
            with mock.patch.object(steam_size, "fetch_store_requirements",
                                   side_effect=failure) as fetch:
                self.assertEqual(service.lookup(123)["status"], "rate_limited")
                self.assertEqual(service.lookup(234)["status"], "deferred")
                self.assertEqual(service.lookup(123)["status"], "rate_limited")
                fetch.assert_called_once()

    def test_decky_rpc_only_uses_bundled_service_and_validates_inputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = steam_size.SteamSizeService(pathlib.Path(tmp) / "cache.json")
            with mock.patch.object(main, "_load_steam_size", return_value=steam_size), \\
                 mock.patch.object(main, "_steam_size_cache_path",
                                   return_value=pathlib.Path(tmp) / "cache.json"), \\
                 mock.patch.object(steam_size, "fetch_store_requirements",
                                   return_value=response()):
                plugin = main.Plugin()
                self.assertEqual(asyncio.run(plugin.steam_install_size(0))["status"], "invalid")
                self.assertEqual(asyncio.run(plugin.steam_install_size(123))["estimated_gb"], 70)
                records = asyncio.run(plugin.steam_size_cached_bulk([123]))
                self.assertEqual(records["entries"][0]["estimated_gb"], 70)
                self.assertEqual(asyncio.run(plugin.steam_size_cached_bulk(
                    list(range(1001)))), {"entries": []})


if __name__ == "__main__":
    unittest.main()
