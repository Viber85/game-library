import asyncio
import json
import pathlib
import tempfile
import unittest
from unittest import mock

import hltb
from main import Plugin


class HowLongToBeatTests(unittest.TestCase):
    def test_identifies_selected_game_and_converts_seconds_to_hours(self):
        entries = [
            {"game_name": "Mad Max", "game_id": 13733,
             "comp_main": 72000, "comp_plus": 129600, "comp_100": 221400},
            {"game_name": "Max Payne", "game_id": 999,
             "comp_main": 3600, "comp_plus": 5400, "comp_100": 7200},
        ]
        value = hltb._selected_result("Mad Max", entries)
        self.assertEqual(value["name"], "Mad Max")
        self.assertEqual(value["main"], 20)
        self.assertEqual(value["extras"], 36)
        self.assertEqual(value["completionist"], 61.5)
        self.assertEqual(value["url"], "https://howlongtobeat.com/game/13733")

    def test_no_fabricated_result_for_weak_name_matches(self):
        candidates = [{"game_name":"Rocket Racing", "game_id":12, "comp_main":10000}]
        self.assertIsNone(hltb._selected_result("Mad Max", candidates))

    def test_cache_stops_repeated_requests_and_stale_success_survives_network_failure(self):
        item = [{"game_name":"Hollow Knight","game_id":25,
                 "comp_main":72000,"comp_plus":100000,"comp_100":180000}]
        with tempfile.TemporaryDirectory() as folder:
            path = pathlib.Path(folder) / "hltb.json"
            svc = hltb.HltbService(path)
            with mock.patch.object(hltb,"_search",return_value=item) as search:
                result = svc.lookup(367520,"Hollow Knight")
                self.assertEqual(result["status"],"ok")
                self.assertEqual(svc.lookup(367520,"Hollow Knight")["cached"],True)
                search.assert_called_once()
            self.assertTrue(path.exists())
            svc2=hltb.HltbService(path)
            self.assertTrue(svc2.lookup(367520,"Hollow Knight")["cached"])
            svc2._cache["367520"]["timestamp"]=0
            with mock.patch.object(hltb,"_search",side_effect=OSError("offline")):
                stale = svc2.lookup(367520,"Hollow Knight")
            self.assertEqual(stale["data"]["main"],20)
            self.assertEqual(stale["status"],"ok")

    def test_nonsteam_launcher_is_not_queried(self):
        with tempfile.TemporaryDirectory() as folder:
            svc=hltb.HltbService(pathlib.Path(folder)/"cache.json")
            with mock.patch.object(hltb,"_search") as search:
                result=svc.lookup(1234,"rpcs3.exe")
            self.assertEqual(result["status"],"unavailable")
            search.assert_not_called()


class HomePreferenceTests(unittest.TestCase):
    def test_home_defaults_on_and_persists_off(self):
        with tempfile.TemporaryDirectory() as folder:
            with mock.patch("main._settings_path",return_value=pathlib.Path(folder)/"settings.json"):
                plugin=Plugin()
                self.assertEqual(asyncio.run(plugin.get_dashboard_settings()),{"default_home":True})
                self.assertTrue(asyncio.run(plugin.set_dashboard_settings(False)))
                self.assertEqual(asyncio.run(plugin.get_dashboard_settings()),{"default_home":False})
                self.assertFalse(asyncio.run(plugin.set_dashboard_settings("false")))
