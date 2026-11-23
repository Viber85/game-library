"""Offline tests for installed Proton compatibility-tool discovery."""
import importlib.util
import pathlib
import tempfile
import types
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("game_library_gog_proton_test",
                                              ROOT / "gog_proton.py")
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class FakeInstaller:
    def __init__(self, home):
        self.home = home

    def _home(self):
        return self.home, types.SimpleNamespace(pw_uid=1000, pw_gid=1000)


class GogProtonDiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = pathlib.Path(self.temp.name)
        self.root = self.home / ".local" / "share" / "Steam"
        self.root.mkdir(parents=True)
        self.installer = FakeInstaller(self.home)

    def valve(self, title, healthy=True):
        path = self.root / "steamapps" / "common" / title
        path.mkdir(parents=True)
        if healthy:
            (path / "proton").write_text("launch")
            (path / "toolmanifest.vdf").write_text('"version" "2"')
        return path

    def custom(self, folder, internal_name, healthy=True):
        path = self.root / "compatibilitytools.d" / folder
        path.mkdir(parents=True)
        if healthy:
            (path / "proton").write_text("launch")
        (path / "compatibilitytool.vdf").write_text(
            '"compat_tools" { "'+internal_name+'" { "display_name" "'+folder+'" } }'
        )
        return path

    def test_builtin_tools_have_registered_steam_internal_ids(self):
        self.valve("Proton - Experimental")
        self.valve("Proton 10.0")
        self.valve("Proton 9.0")
        self.valve("Proton - Hotfix")
        found = module.discover(self.installer)
        self.assertTrue(found["ok"])
        ids = [x["strToolName"] for x in found["tools"]]
        self.assertEqual(set(ids), {
            "proton_experimental", "proton_10", "proton_9",
            "proton_hotfix"
        })
        self.assertTrue(all(x["source"] == "valve" for x in found["tools"]))

    def test_custom_tools_use_top_level_compat_tools_key_not_directory_guess(self):
        self.custom("GE-Proton10-8", "GE-Proton10-8")
        self.custom("Proton-CachyOS", "proton_cachyos_latest")
        ids = [x["strToolName"] for x in module.discover(self.installer)["tools"]]
        self.assertIn("GE-Proton10-8", ids)
        self.assertIn("proton_cachyos_latest", ids)

    def test_incomplete_and_unregistered_tools_are_ignored(self):
        self.valve("Proton - Experimental", healthy=False)
        self.custom("GE-ProtonUninstalled", "GE-Proton1", healthy=False)
        self.custom("Custom", "../../../wrong")
        self.valve("Ordinary Game")
        found = module.discover(self.installer)
        self.assertTrue(found["ok"])
        self.assertEqual(found["tools"], [])

    def test_steam_symlink_root_and_duplicates_not_reported_twice(self):
        self.valve("Proton - Experimental")
        (self.home / ".steam").mkdir()
        (self.home / ".steam" / "root").symlink_to(
            self.root, target_is_directory=True
        )
        items = module.discover(self.installer)["tools"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["strToolName"], "proton_experimental")

    def test_no_installed_tools_returns_safe_empty_result(self):
        self.assertEqual(module.discover(self.installer), {"ok":True,"tools":[]})

    def test_exception_never_exposes_home_paths(self):
        class NoUser:
            def _home(self):
                raise ValueError("private path /home/user")

        result = module.discover(NoUser())
        self.assertFalse(result["ok"])
        self.assertNotIn("/home/user", str(result))
