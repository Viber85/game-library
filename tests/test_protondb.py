import json
import pathlib
import tempfile
import unittest
from unittest import mock

import protondb
import main


class ProtonDBTests(unittest.TestCase):
    def test_recognizes_only_valid_community_ratings(self):
        for tier in ("platinum","gold","silver","bronze","borked"):
            parsed=protondb.parse_rating({"tier":tier.upper(),"confidence":"good"})
            self.assertEqual(parsed["tier"],tier)
        for tier in ("pending","verified","unknown","",None):
            self.assertIsNone(protondb.parse_rating({"tier":tier}))
        self.assertIsNone(protondb.parse_rating(None))

    def test_caching_does_not_requery_each_game_selection(self):
        with tempfile.TemporaryDirectory() as temp:
            path=pathlib.Path(temp)/"protondb.json"
            service=protondb.ProtonDBService(path)
            with mock.patch.object(protondb,"fetch_rating",
                                   return_value={"tier":"gold","source":"ProtonDB"}) as fetch:
                first=service.get(367520)
                cached=service.get(367520)
            self.assertEqual(first["tier"],"gold")
            self.assertEqual(cached["tier"],"gold")
            self.assertTrue(cached["cached"])
            fetch.assert_called_once()
            self.assertEqual(protondb.ProtonDBService(path).get(367520)["tier"],"gold")

    def test_missing_rating_not_mislabeled_borked(self):
        with tempfile.TemporaryDirectory() as temp:
            with mock.patch.object(protondb,"fetch_rating",return_value=None):
                result=protondb.ProtonDBService(pathlib.Path(temp)/"protondb.json").get(9999999)
        self.assertEqual(result["status"],"unavailable")
        self.assertIsNone(result["tier"])

    def test_network_failure_does_not_invent_rating(self):
        with tempfile.TemporaryDirectory() as temp:
            with mock.patch.object(protondb,"fetch_rating",side_effect=OSError("offline")):
                result=protondb.ProtonDBService(pathlib.Path(temp)/"protondb.json").get(367520)
        self.assertEqual(result["status"],"error")
        self.assertIsNone(result["tier"])

    def test_epic_gog_name_resolution_uses_exact_steam_title(self):
        names = [
            {"name":"Shadow Warrior 2","id":324800},
            {"name":"Shadow Warrior","id":233130},
            {"name":"Shadow Warrior 3","id":1036890},
        ]
        result = protondb.choose_steam_title("Shadow Warrior 2",names)
        self.assertEqual(result["appid"],324800)
        self.assertEqual(result["name"],"Shadow Warrior 2")

    def test_title_lookup_does_not_guess_unrelated_or_ambiguous_matches(self):
        self.assertIsNone(protondb.choose_steam_title("Hades",[
            {"name":"Hades II","id":1145350},
            {"name":"Hadean Tactics","id":1260590},
        ]))
        self.assertIsNone(protondb.choose_steam_title("Different Game",[
            {"name":"Shadow Warrior 2","id":324800}
        ]))

    def test_shortcut_title_cache_and_launcher_exclusion(self):
        with tempfile.TemporaryDirectory() as temp:
            service=protondb.ProtonDBNameResolver(pathlib.Path(temp)/"titles.json")
            with mock.patch.object(protondb,"fetch_steam_title",
                return_value={"appid":324800,"name":"Shadow Warrior 2"}) as fetch:
                first=service.resolve("Shadow Warrior 2")
                second=service.resolve("Shadow Warrior 2")
                self.assertEqual(first,second)
                fetch.assert_called_once()
            self.assertIsNone(service.resolve("rpcs3.exe"))

    def test_backend_resolves_shortcut_before_protondb_rating(self):
        import asyncio
        service=main.Plugin()
        class Resolver:
            def resolve(self,title):
                return {"appid":324800,"name":"Shadow Warrior 2"}
        class Ratings:
            def get(self,appid):
                self.appid=appid
                return {"status":"ok","tier":"gold","cached":False}
        service._protondb_name_resolver=Resolver()
        service._protondb_service=Ratings()
        reply=asyncio.run(service.protondb_for_game(1000000000,"Shadow Warrior 2",True))
        self.assertEqual(reply["tier"],"gold")
        self.assertEqual(reply["appid"],324800)
        self.assertEqual(service._protondb_service.appid,324800)

    def test_rejects_invalid_appid(self):
        with tempfile.TemporaryDirectory() as temp:
            with mock.patch.object(protondb,"fetch_rating") as fetch:
                result=protondb.ProtonDBService(pathlib.Path(temp)/"protondb.json").get(-1)
            fetch.assert_not_called()
            self.assertIsNone(result["tier"])

    def test_backend_import_isolated_from_decky_python_path(self):
        with tempfile.TemporaryDirectory() as temp:
            import sys
            plugin_dir=main.BASE
            narrowed=[p for p in sys.path if pathlib.Path(p or ".").resolve()!=plugin_dir]
            with mock.patch.object(sys,"path",narrowed):
                with mock.patch.dict(sys.modules,{"protondb":None}):
                    cls=main._load_protondb().ProtonDBService
            self.assertTrue(callable(cls))


if __name__=="__main__":
    unittest.main()
