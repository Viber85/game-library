"""Pure local HLTB bulk-cache tests: no live HTTP or SteamOS required."""
import asyncio
import json
import pathlib
import tempfile
import unittest
from unittest import mock

import hltb
import main


NOW = 1_900_000_000
DAY = 86400


class HltbBulkCacheTests(unittest.TestCase):
    def make_service(self, directory):
        path = pathlib.Path(directory) / "hltb_cache.json"
        data = {
            "101": {"query": "Hades", "timestamp": NOW-2*DAY,
                    "data": {"main": 20.0, "extras": 31.2, "completionist": 50}},
            "102": {"query": "Portal", "timestamp": NOW-3600, "data": None},
            "103": {"query": "Stale Success", "timestamp": NOW-9*DAY,
                    "data": {"main": 5, "extras": 8.4, "completionist": 20}},
            "104": {"query": "Expired Miss", "timestamp": NOW-DAY, "data": None},
            "105": {"query": "A Changed Title", "timestamp": NOW-100,
                    "data": {"extras": 40}},
            "106": {"query": "No Extra Data", "timestamp": NOW-100,
                    "data": {"main": 10, "extras": None}},
        }
        path.write_text(json.dumps(data), encoding="utf-8")
        return hltb.HltbService(path)

    def test_batch_serves_fresh_hits_and_fresh_misses_from_disk_without_network(self):
        with tempfile.TemporaryDirectory() as tmp, \
             mock.patch.object(hltb.time, "time", return_value=NOW), \
             mock.patch.object(hltb, "_search") as search:
            svc = self.make_service(tmp)
            result = svc.cached_bulk([
                {"id": 101, "title": "Hades"},
                {"id": 102, "title": "Portal"},
                {"id": 106, "title": "No Extra Data"},
                {"id": 444, "title": "Unknown"},
            ])
            rows = {r["id"]: r for r in result["entries"]}
            self.assertEqual(set(rows), {101, 102, 106})
            self.assertEqual(rows[101]["extras"], 31.2)
            self.assertTrue(rows[101]["fresh"])
            self.assertGreater(rows[101]["expires_in"], 4*DAY)
            self.assertIsNone(rows[102]["extras"])
            self.assertTrue(rows[102]["fresh"])
            self.assertLessEqual(rows[102]["expires_in"], 12*3600)
            self.assertEqual(rows[106]["extras"], None)
            self.assertTrue(rows[106]["fresh"])
            search.assert_not_called()

    def test_expired_hits_display_old_main_plus_extras_but_remain_eligible_for_refresh(self):
        with tempfile.TemporaryDirectory() as tmp, \
             mock.patch.object(hltb.time, "time", return_value=NOW), \
             mock.patch.object(hltb, "_search") as search:
            svc = self.make_service(tmp)
            rows = {r["id"]: r for r in svc.cached_bulk([
                {"id": 103, "title": "Stale Success"},
                {"id": 104, "title": "Expired Miss"},
            ])["entries"]}
            self.assertEqual(rows[103]["extras"], 8.4)
            self.assertFalse(rows[103]["fresh"])
            self.assertEqual(rows[103]["expires_in"], 0)
            self.assertFalse(rows[104]["fresh"])
            self.assertIsNone(rows[104]["extras"])
            search.assert_not_called()

    def test_name_mismatch_and_invalid_rows_are_never_reused_as_other_games(self):
        with tempfile.TemporaryDirectory() as tmp, \
             mock.patch.object(hltb.time, "time", return_value=NOW):
            svc = self.make_service(tmp)
            results = svc.cached_bulk([
                {"id": 105, "title": "Different Game"},
                {"id": 105, "title": "A Changed Title"},
                {"id": -1, "title": "Hades"},
                {"id": "101", "title": "Hades"},
                {"id": 2**32, "title": "Hades"},
                {"id": True, "title": "Hades"},
                {"id": 101, "title": 77},
                {"id": 101, "title": "Hades"},
                None, {},
            ])
            self.assertEqual([x["id"] for x in results["entries"]], [105, 101])
            self.assertEqual(results["entries"][0]["title"], "A Changed Title")
            self.assertEqual(svc.cached_bulk("bad")["entries"], [])
            self.assertEqual(svc.cached_bulk([{}]*1001)["entries"], [])

    def test_main_plus_extras_only_never_falls_back_to_main_story(self):
        with tempfile.TemporaryDirectory() as tmp, \
             mock.patch.object(hltb.time, "time", return_value=NOW):
            svc = self.make_service(tmp)
            result = svc.cached_bulk([{"id": 106, "title": "No Extra Data"}])
            self.assertIsNone(result["entries"][0]["extras"])
            self.assertNotIn("main", result["entries"][0])
            self.assertNotIn("completionist", result["entries"][0])

    def test_backend_bulk_endpoint_reads_persisted_cache_in_one_local_call(self):
        with tempfile.TemporaryDirectory() as tmp, \
             mock.patch.object(hltb.time, "time", return_value=NOW), \
             mock.patch.object(main, "_runtime_cache_path",
                               return_value=pathlib.Path(tmp)/"hltb_cache.json"), \
             mock.patch.object(main, "_load_hltb", return_value=hltb), \
             mock.patch.object(hltb, "_search") as search:
            self.make_service(tmp)
            plugin = main.Plugin()
            response = asyncio.run(plugin.hltb_cached_bulk([
                {"id": 101, "title": "Hades"},
                {"id": 102, "title": "Portal"},
            ]))
            self.assertEqual(len(response["entries"]), 2)
            self.assertEqual(response["entries"][0]["extras"], 31.2)
            self.assertTrue(response["entries"][1]["fresh"])
            self.assertEqual(asyncio.run(plugin.hltb_cached_bulk([{}]*1001)),
                             {"entries": []})
            search.assert_not_called()

    def test_lookups_preserve_expired_values_when_provider_is_offline(self):
        with tempfile.TemporaryDirectory() as tmp, \
             mock.patch.object(hltb.time, "time", return_value=NOW), \
             mock.patch.object(hltb, "_search", side_effect=OSError("offline")):
            svc = self.make_service(tmp)
            stale = svc.lookup(103, "Stale Success")
            self.assertEqual(stale["status"], "ok")
            self.assertTrue(stale["stale"])
            self.assertEqual(stale["expires_in"], 0)
            self.assertEqual(stale["data"]["extras"], 8.4)


if __name__ == "__main__":
    unittest.main()
