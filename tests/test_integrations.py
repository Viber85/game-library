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


class TabMasterTests(unittest.TestCase):
    def test_active_account_only_and_tab_order(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp)
            own=root / "Game Library"
            own.mkdir()
            # Decky stores disabled_plugins in settings/loader.json; an
            # existing TabMaster/settings.json is not enough to be active.
            (root / "loader.json").write_text(json.dumps({"disabled_plugins":[]}))
            tabmaster=root / "TabMaster"
            tabmaster.mkdir()
            settings=tabmaster / "settings.json"
            settings.write_text(json.dumps({"usersDict":{
                "42":{"tabs":{
                    "GOG":{"title":"GOG","position":2,"filters":[{"type":"collection","params":{"id":"gog"},"inverted":False}]},
                    "AllGames":{"title":"ALL GAMES","position":0},
                    "Epic":{"title":"EPIC","position":1},
                    "Hidden":{"title":"Hidden","position":-1}
                }},
                "99":{"tabs":{"Other":{"title":"Private","position":0}}}
            }}))
            with mock.patch.dict(os.environ,{"DECKY_PLUGIN_SETTINGS_DIR":str(own)}):
                actual=asyncio.run(Plugin().get_tabmaster_tabs("76561197960265770"))
                self.assertTrue(actual["available"])
                self.assertEqual([t["title"] for t in actual["tabs"]],["ALL GAMES","EPIC","GOG"])
                other=asyncio.run(Plugin().get_tabmaster_tabs("76561197960265771"))
                self.assertFalse(other["available"])
                self.assertEqual(other["tabs"],[])
                # Disable TabMaster without touching its saved configuration.
                (root / "loader.json").write_text(
                    json.dumps({"disabled_plugins":["TabMaster","Other Plugin"]}))
                disabled=asyncio.run(Plugin().get_tabmaster_tabs("76561197960265770"))
                self.assertFalse(disabled["available"])
                self.assertEqual(disabled["tabs"],[])
                self.assertIn("disabled",disabled["reason"].lower())
                self.assertEqual(disabled["mode"],"auto")
                # Enable it again and confirm the same tabs are restored.
                (root / "loader.json").write_text(json.dumps({"disabled_plugins":[]}))
                back=asyncio.run(Plugin().get_tabmaster_tabs("76561197960265770"))
                self.assertTrue(back["available"])
                self.assertEqual([t["title"] for t in back["tabs"]],["ALL GAMES","EPIC","GOG"])
                # Manual Steam mode intentionally ignores TabMaster config.
                self.assertTrue(asyncio.run(Plugin().set_tab_source("steam")))
                steam=asyncio.run(Plugin().get_tabmaster_tabs("76561197960265770"))
                self.assertFalse(steam["available"])
                self.assertEqual(steam["mode"],"steam")
                self.assertEqual(steam["tabs"],[])
                # Manual TabMaster mode works only when the plugin is enabled.
                self.assertTrue(asyncio.run(Plugin().set_tab_source("tabmaster")))
                self.assertTrue(asyncio.run(Plugin().get_tabmaster_tabs("76561197960265770"))["available"])
                self.assertTrue(asyncio.run(Plugin().set_tab_source("auto")))

    def test_source_preferences_default_and_missing_loader_state_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp)
            own=root/"Game Library"
            own.mkdir()
            tabs=root/"TabMaster"
            tabs.mkdir()
            (tabs/"settings.json").write_text(json.dumps({"usersDict":{
                "42":{"tabs":{"AllGames":{"title":"All Games","position":0}}}
            }}))
            with mock.patch.dict(os.environ,{"DECKY_PLUGIN_SETTINGS_DIR":str(own)}):
                self.assertEqual(asyncio.run(Plugin().get_dashboard_settings())["tab_source"],"auto")
                missing=asyncio.run(Plugin().get_tabmaster_tabs("76561197960265770"))
                self.assertFalse(missing["available"])
                self.assertIn("loader",missing["reason"].lower())
                (root/"loader.json").write_text("{oops")
                corrupt=asyncio.run(Plugin().get_tabmaster_tabs("76561197960265770"))
                self.assertFalse(corrupt["available"])
                self.assertFalse(asyncio.run(Plugin().set_tab_source("invalid")))
                self.assertEqual(asyncio.run(Plugin().get_dashboard_settings())["tab_source"],"auto")
                (root/"loader.json").write_text(json.dumps({"disabled_plugins":[]}))
                self.assertTrue(asyncio.run(Plugin().get_tabmaster_tabs("76561197960265770"))["available"])
                self.assertTrue(asyncio.run(Plugin().set_tab_source("steam")))
                self.assertEqual(asyncio.run(Plugin().get_dashboard_settings())["tab_source"],"steam")
                self.assertTrue(asyncio.run(Plugin().set_dashboard_settings(False)))
                self.assertEqual(asyncio.run(Plugin().get_dashboard_settings()),
                                 {"default_home":False,"tab_source":"steam"})


if __name__=="__main__":
    unittest.main()
