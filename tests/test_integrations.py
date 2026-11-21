import asyncio
import json
import os
import pathlib
import sys
import main
import tempfile
import unittest
from unittest import mock

from main import Plugin
from updates import parse_version, validate_github_feed


class UpdateTests(unittest.TestCase):
    def test_versions(self):
        self.assertTrue(parse_version("v0.2.0-test.1") > parse_version("v0.1.0"))
        self.assertTrue(parse_version("v0.2.0") > parse_version("v0.2.0-test.10"))
        self.assertIsNone(parse_version("bad/v1.0.0"))

    def test_validated_asset(self):
        with tempfile.TemporaryDirectory() as tmp:
            pkg = pathlib.Path(tmp) / "package.json"
            pkg.write_text('{"version":"0.1.0"}')
            tag = "v0.2.0-test.1"
            name = "game-library-v0.2.0-test.1.zip"
            url = "https://github.com/Viber85/game-library/releases/download/" + tag + "/" + name
            release = {"tag_name":tag, "draft":False, "body":"Updates", "assets":[{
                "name":name,"browser_download_url":url,"size":100000,
                "digest":"sha256:" + "a"*64,
            }]}
            result = validate_github_feed(pkg, json.dumps([release]))
            self.assertTrue(result["available"])
            self.assertEqual(result["latest"]["sha256"], "a"*64)
            release["assets"][0]["browser_download_url"] = "https://untrusted.example/zip"
            self.assertFalse(validate_github_feed(pkg,json.dumps([release]))["available"])


    def test_packaged_updater_import_is_independent_of_sys_path(self):
        """Reproduce Decky importing main.py without adding its folder to sys.path."""
        plugin_folder = str(main.BASE)
        narrowed_path = [p for p in sys.path if pathlib.Path(p or ".").resolve() != main.BASE]
        with mock.patch.object(sys, "path", narrowed_path):
            with mock.patch.dict(sys.modules, {"updates": None}):
                result = asyncio.run(Plugin().validate_github_releases("[]"))
        self.assertTrue(result.get("ok"), result)
        self.assertFalse(result.get("available"))
        self.assertNotIn("No module named", str(result))

    def test_packaged_updater_missing_module_is_actionable(self):
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.object(main, "BASE", pathlib.Path(tmp)):
                result = asyncio.run(Plugin().validate_github_releases("[]"))
        self.assertFalse(result["ok"])
        self.assertIn("updates.py missing", result["error"])


class OwnTabsTests(unittest.TestCase):
    def test_saved_per_account_without_peer_plugins(self):
        with tempfile.TemporaryDirectory() as tmp:
            own=pathlib.Path(tmp)/"Game Library"
            own.mkdir()
            with mock.patch.dict(os.environ,{"DECKY_PLUGIN_SETTINGS_DIR":str(own)}):
                original=asyncio.run(Plugin().get_library_tabs("42"))
                self.assertTrue(original["ok"])
                self.assertEqual([t["id"] for t in original["tabs"]],
                    ["AllGames","Installed","Steam","NonSteam","Favorites"])
                tabs=original["tabs"]
                tabs[0]["title"]="Every game"
                tabs[1]["visible"]=False
                tabs.append({"id":"custom-rpg123","title":"RPG", "kind":"custom",
                             "filter":"not-installed","position":5,"visible":True})
                saved=asyncio.run(Plugin().save_library_tabs("42",tabs))
                self.assertTrue(saved["ok"], saved)
                self.assertEqual(len(asyncio.run(Plugin().get_library_tabs("42"))["tabs"]),6)
                self.assertEqual(asyncio.run(Plugin().get_library_tabs("99"))["tabs"][0]["title"],"All Games")
                persisted=json.loads((own/"game_library.json").read_text())
                self.assertIn("42",persisted["tabs_by_user"])
                self.assertNotIn("99",persisted["tabs_by_user"])
                self.assertEqual(persisted["tabs_by_user"]["42"][5]["filter"],"not-installed")
                self.assertEqual(asyncio.run(Plugin().get_dashboard_settings()),
                                 {"default_home":True})
                self.assertTrue(asyncio.run(Plugin().set_dashboard_settings(False)))
                self.assertEqual(asyncio.run(Plugin().get_library_tabs("42"))["tabs"][0]["title"],
                                 "Every game")

    def test_invalid_tab_changes_fail_closed_and_preserve_last_good(self):
        with tempfile.TemporaryDirectory() as tmp:
            own=pathlib.Path(tmp)/"Game Library"
            own.mkdir()
            with mock.patch.dict(os.environ,{"DECKY_PLUGIN_SETTINGS_DIR":str(own)}):
                tabs=asyncio.run(Plugin().get_library_tabs("42"))["tabs"]
                failures=[tabs[:-1],
                          [{**tab,"visible":False} for tab in tabs],
                          [{**tab,"filter":"not-installed"} if tab["id"]=="Steam" else tab for tab in tabs],
                          tabs+[dict(tabs[0])],
                          [{**tab,"position":0} for tab in tabs]]
                for invalid in failures:
                    self.assertFalse(asyncio.run(
                        Plugin().save_library_tabs("42",invalid))["ok"])
                self.assertFalse(asyncio.run(Plugin().save_library_tabs("../",tabs))["ok"])
                self.assertFalse(asyncio.run(Plugin().get_library_tabs(""))["ok"])
                self.assertEqual(asyncio.run(Plugin().get_library_tabs("42"))["tabs"],tabs)
                self.assertFalse((own/"game_library.json").exists())

    def test_manual_membership_is_per_user_and_is_validated(self):
        with tempfile.TemporaryDirectory() as tmp:
            own=pathlib.Path(tmp)/"Game Library"
            own.mkdir()
            with mock.patch.dict(os.environ,{"DECKY_PLUGIN_SETTINGS_DIR":str(own)}):
                original=asyncio.run(Plugin().get_library_tabs("42"))["tabs"]
                self.assertEqual(len(original),5)
                manual={"id":"custom-manual-rpg","title":"My RPG",
                        "position":5,"visible":True,"kind":"custom",
                        "filter":"all","mode":"manual","members":[4,2,999]}
                saved=asyncio.run(Plugin().save_library_tabs("42",original+[manual]))
                self.assertTrue(saved["ok"],saved)
                self.assertEqual(saved["tabs"][5]["members"],[2,4,999])
                self.assertEqual(saved["tabs"][5]["mode"],"manual")
                self.assertEqual(len(asyncio.run(Plugin().get_library_tabs("99"))["tabs"]),5)
                changed=saved["tabs"]
                for invalid_members in ([0],[True],[2,2],[3.5],[9007199254740992]):
                    broken=[dict(t) for t in changed]
                    broken[5]["members"]=invalid_members
                    self.assertFalse(asyncio.run(
                        Plugin().save_library_tabs("42",broken))["ok"])
                self.assertEqual(asyncio.run(Plugin().get_library_tabs("42"))["tabs"][5]["members"],
                                 [2,4,999])
                self.assertFalse(asyncio.run(
                    Plugin().save_library_tabs("42",changed+
                        [{**manual,"id":"custom-manual-rpg2","position":6,
                          "members":list(range(1,2003))}]))["ok"])

    def test_smart_rules_are_atomic_validated_and_migrate_legacy_filter(self):
        with tempfile.TemporaryDirectory() as tmp:
            own=pathlib.Path(tmp)/"Game Library"
            own.mkdir()
            with mock.patch.dict(os.environ,{"DECKY_PLUGIN_SETTINGS_DIR":str(own)}):
                original=asyncio.run(Plugin().get_library_tabs("42"))["tabs"]
                legacy={"id":"custom-old123","title":"Old filtered tab",
                        "position":5,"visible":True,"kind":"custom",
                        "filter":"not-installed","mode":"smart","members":[]}
                saved=asyncio.run(Plugin().save_library_tabs("42",original+[legacy]))
                self.assertTrue(saved["ok"],saved)
                self.assertEqual(saved["tabs"][5]["rules"],[{"type":"not-installed"}])
                self.assertEqual(saved["tabs"][5]["ruleJoin"],"all")
                smart=saved["tabs"]
                smart[5]["rules"]=[{"type":"installed"},{"type":"steam"}]
                smart[5]["ruleJoin"]="any"
                smart[5]["forceInclude"]=[3,12]
                smart[5]["forceExclude"]=[9]
                saved=asyncio.run(Plugin().save_library_tabs("42",smart))
                self.assertTrue(saved["ok"],saved)
                self.assertEqual(saved["tabs"][5]["forceInclude"],[3,12])
                self.assertEqual(saved["tabs"][5]["forceExclude"],[9])
                self.assertEqual(saved["tabs"][5]["ruleJoin"],"any")
                self.assertEqual(asyncio.run(Plugin().get_library_tabs("99"))["tabs"],
                                 original)
                invalid_rules=(
                    [{"type":"unknown"}],
                    [{"type":"steam"},{"type":"steam"}],
                    [{"type":4}],
                    [{"type":"steam","other":True}],
                    ["steam"],
                    [{"type":"steam"}]*13,
                )
                for rules in invalid_rules:
                    bad=[dict(t) for t in saved["tabs"]]
                    bad[5]["rules"]=rules
                    self.assertFalse(asyncio.run(
                        Plugin().save_library_tabs("42",bad))["ok"])
                bad=[dict(t) for t in saved["tabs"]]
                bad[5]["forceExclude"]=[3]
                self.assertFalse(asyncio.run(Plugin().save_library_tabs("42",bad))["ok"])
                bad=[dict(t) for t in saved["tabs"]]
                bad[0]["rules"]=[{"type":"steam"}]
                self.assertFalse(asyncio.run(Plugin().save_library_tabs("42",bad))["ok"])
                bad=[dict(t) for t in saved["tabs"]]
                bad[5]["ruleJoin"]="neither"
                self.assertFalse(asyncio.run(Plugin().save_library_tabs("42",bad))["ok"])
                self.assertEqual(asyncio.run(Plugin().get_library_tabs("42"))["tabs"][5]["rules"],
                                 [{"type":"installed"},{"type":"steam"}])

    def test_ignores_tabmaster_configuration_and_disabled_state(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp)
            own=root/"Game Library"
            own.mkdir()
            peer=root/"TabMaster"
            peer.mkdir()
            (peer/"settings.json").write_text('{"usersDict":{"42":{"tabs":{"X":{}}}}}')
            (root/"loader.json").write_text('{"disabled_plugins":["TabMaster","Unifideck"]}')
            with mock.patch.dict(os.environ,{"DECKY_PLUGIN_SETTINGS_DIR":str(own)}):
                response=asyncio.run(Plugin().get_library_tabs("42"))
                self.assertTrue(response["ok"])
                self.assertEqual(len(response["tabs"]),5)
                self.assertFalse(hasattr(Plugin(),"get_tabmaster_tabs"))
                self.assertFalse(hasattr(Plugin(),"set_tab_source"))


if __name__=="__main__":
    unittest.main()
