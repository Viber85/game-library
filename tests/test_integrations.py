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


if __name__=="__main__":
    unittest.main()
