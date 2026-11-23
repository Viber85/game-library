"""Offline GOG launcher discovery/Proton-shortcut registry tests."""
import importlib.util
import json
import pathlib
import tempfile
import types
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("game_library_gog_launch_test",
                                            ROOT / "gog_launch.py")
launch = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(launch)


class FakeInstaller:
    def __init__(self, root):
        self.root = pathlib.Path(root)
    def _account_and_game(self, gog, account, product):
        if account not in ("1234", "5678") or product not in ("730", "999"):
            raise ValueError("Unknown GOG account or game")
        return account, product
    def _locations(self):
        return [{"key":"internal", "path":str(self.root)}]
    def _existing_status(self, path, account, product):
        marker = path / ".game-library-gog-install.json"
        if marker.is_symlink() or not marker.is_file():
            return "empty"
        data = json.loads(marker.read_text(encoding="utf-8"))
        if data.get("account") != launch.hashlib.sha256(
            account.encode("ascii")).hexdigest()[:24] or data.get("product") != product:
            return "blocked"
        return "complete" if data.get("completed") is True else "resumable"
    def _home(self):
        return self.root, types.SimpleNamespace(pw_uid=1000, pw_gid=1000)


class GogLaunchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.installer = FakeInstaller(self.root)
        self.gog = object()
        # Production gog_install.py exposes _account_and_game, not _account.
        # Do not let a FakeInstaller-only method conceal AttributeError.
        self.assertFalse(hasattr(self.installer, "_account"))

    def completed_game(self, path, account="1234", product="730"):
        path.mkdir(parents=True)
        marker = {
            "store": "gog", "product": product,
            "account": launch.hashlib.sha256(account.encode("ascii")).hexdigest()[:24],
            "completed": True
        }
        (path / ".game-library-gog-install.json").write_text(json.dumps(marker))
        return path

    def test_incomplete_download_is_not_launchable(self):
        game = self.root / "My Game"
        game.mkdir()
        (game / "Game.exe").write_bytes(b"fake")
        self.assertEqual(launch.inspect(self.installer, self.gog, "1234", "730")["status"],
                         "not-installed")

    def test_owned_completed_install_is_found_and_exes_are_ranked(self):
        game = self.completed_game(self.root / "My Game")
        (game / "Game.exe").write_bytes(b"fake exe")
        (game / "unins000.exe").write_bytes(b"fake uninstaller")
        (game / "GameLauncher.exe").write_bytes(b"fake")
        info = launch.inspect(self.installer, self.gog, "1234", "730")
        self.assertEqual(info["status"], "downloaded")
        self.assertEqual(info["install_dir"], str(game))
        self.assertEqual(info["candidates"][0]["relative"], "Game.exe")
        uninstaller = next(c for c in info["candidates"]
                           if c["relative"] == "unins000.exe")
        self.assertFalse(uninstaller["recommended"])
        self.assertEqual(launch.inspect(self.installer,self.gog,"5678","730")["status"],
                         "not-installed")

    def test_fresh_restart_folder_is_discoverable_after_plugin_restart(self):
        root = self.root / ".game-library-restarts" / "730" / "100-abcd"
        game = self.completed_game(root / "My Game")
        (game / "game.exe").write_bytes(b"windows")
        info = launch.inspect(self.installer, self.gog, "1234", "730")
        self.assertEqual(info["status"], "downloaded")
        self.assertEqual(info["install_dir"], str(game))

    def test_store_only_verified_shortcut_then_enable_proton(self):
        game = self.completed_game(self.root / "My Game")
        (game / "Game.exe").write_bytes(b"windows executable")
        self.assertFalse(launch.register(self.installer,self.gog,"1234","730",str(game),
                                         "../another.exe",0x80000001)["ok"])
        self.assertFalse(launch.register(self.installer,self.gog,"1234","730","/tmp",
                                         "Game.exe",0x80000001)["ok"])
        self.assertFalse(launch.register(self.installer,self.gog,"1234","730",str(game),
                                         "Game.exe",33)["ok"])
        r = launch.register(self.installer,self.gog,"1234","730",str(game),
                            "Game.exe",0x90000002)
        self.assertTrue(r["ok"])
        self.assertFalse(r["ready"])
        self.assertEqual(launch.inspect(self.installer,self.gog,"1234","730")["status"],
                         "registered")
        self.assertTrue(launch.register(self.installer,self.gog,"1234","730",str(game),
                                        "Game.exe",0x90000002)["ok"])
        self.assertFalse(launch.register(self.installer,self.gog,"1234","730",str(game),
                                         "Game.exe",0x90000003)["ok"])
        self.assertFalse(launch.finalize(self.installer,self.gog,"1234","730",
                                         0x90000002,"SteamLinuxRuntime")["ok"])
        self.assertTrue(launch.finalize(self.installer,self.gog,"1234","730",
                                        0x90000002,"proton_experimental")["ok"])
        again = launch.inspect(self.installer,self.gog,"1234","730")
        self.assertEqual(again["status"], "ready")
        self.assertEqual(again["shortcut"]["app_id"],0x90000002)
        self.assertEqual(again["shortcut"]["tool"],"proton_experimental")

    def test_outside_symlink_and_other_accounts_are_rejected(self):
        game = self.completed_game(self.root / "My Game")
        target = self.root / "not-game.exe"
        target.write_bytes(b"fake")
        (game / "evil.exe").symlink_to(target)
        (game / "good.exe").write_bytes(b"fake")
        status = launch.inspect(self.installer,self.gog,"1234","730")
        self.assertEqual([x["relative"] for x in status["candidates"]],["good.exe"])
        self.assertFalse(launch.register(self.installer,self.gog,"5678","730",
                                         str(game),"good.exe",0x80000001)["ok"])
        self.assertFalse(launch.register(self.installer,self.gog,"1234","999",
                                         str(game),"good.exe",0x80000001)["ok"])

    def test_empty_or_unrecognized_exe_is_not_automatically_playable(self):
        game=self.completed_game(self.root/"My Game")
        (game/"setup.exe").write_bytes(b"installer")
        (game/"empty.exe").touch()
        r=launch.inspect(self.installer,self.gog,"1234","730")
        self.assertEqual(r["status"],"downloaded")
        self.assertEqual(len(r["candidates"]),1)
        self.assertEqual(r["candidates"][0]["relative"],"setup.exe")
        self.assertFalse(r["candidates"][0]["recommended"])

    def test_shortcut_is_registered_in_private_user_storage_not_game_folder(self):
        game = self.completed_game(self.root / "On SD Card")
        (game / "Game.exe").write_bytes(b"game")
        reply = launch.register(self.installer, self.gog, "1234", "730",
                                str(game), "Game.exe", 0x90000021)
        self.assertTrue(reply["ok"], reply)
        registry, _, _ = launch._registry_path(self.installer, game, "1234", "730")
        self.assertTrue(registry.is_file())
        self.assertTrue(str(registry).startswith(str(self.root / ".local")))
        self.assertFalse((game / launch._LAUNCH_MARKER).exists())
        self.assertEqual(launch.inspect(self.installer,self.gog,"1234","730")
                         ["shortcut"]["app_id"], 0x90000021)
        self.assertTrue(launch.finalize(self.installer, self.gog, "1234", "730",
                                        0x90000021, "proton_experimental")["ok"])
        self.assertTrue(launch.inspect(self.installer,self.gog,"1234","730")
                        ["shortcut"]["ready"])

    def test_private_registry_paths_are_account_and_install_location_scoped(self):
        one = self.completed_game(self.root / "Game One")
        two = self.completed_game(self.root / "Game Two")
        a = launch._registry_path(self.installer, one, "1234", "730")[0]
        b = launch._registry_path(self.installer, two, "1234", "730")[0]
        c = launch._registry_path(self.installer, one, "5678", "730")[0]
        self.assertNotEqual(a,b)
        self.assertNotEqual(a,c)

    def test_legacy_in_game_shortcut_marker_remains_readable(self):
        game = self.completed_game(self.root / "Legacy Game")
        (game / "Game.exe").write_bytes(b"game")
        marker = {"account":launch.hashlib.sha256(b"1234").hexdigest()[:24],
                  "product":"730","relative":"Game.exe","app_id":0x90000028,
                  "tool":"proton_experimental"}
        (game / launch._LAUNCH_MARKER).write_text(json.dumps(marker))
        info = launch.inspect(self.installer,self.gog,"1234","730")
        self.assertEqual(info["status"],"ready")
        self.assertEqual(info["shortcut"]["app_id"],0x90000028)

    def test_gog_shortcut_storage_error_reports_os_error_instead_of_generic(self):
        game = self.completed_game(self.root / "Error Game")
        (game / "Game.exe").write_bytes(b"game")
        from unittest import mock
        import errno
        with mock.patch.object(launch,"_write_launch",
             side_effect=OSError(errno.EACCES,"Permission denied")):
            result = launch.register(self.installer,self.gog,"1234","730",
                                     str(game),"Game.exe",0x90000029)
        self.assertFalse(result["ok"])
        self.assertIn("OS error 13",result["reason"])

    def test_symlinked_private_registry_parent_is_rejected(self):
        game = self.completed_game(self.root / "Link Game")
        (game / "Game.exe").write_bytes(b"game")
        home = self.root
        (home / ".local").symlink_to(game, target_is_directory=True)
        result = launch.register(self.installer,self.gog,"1234","730",
                                 str(game),"Game.exe",0x90000030)
        self.assertFalse(result["ok"])
        self.assertIn("Unsafe",result["reason"])

    def test_register_works_with_actual_gog_installer_interface(self):
        """Regression for test.59: Steam created shortcut, then Python crashed
        because register invoked nonexistent installer._account()."""
        game = self.completed_game(self.root / "Commandos")
        (game / "comandos.exe").write_bytes(b"windows")
        reply = launch.register(
            self.installer, self.gog, "1234", "730",
            str(game), "comandos.exe", 0x90000101)
        self.assertTrue(reply["ok"], reply)
        self.assertEqual(reply["app_id"], 0x90000101)
        self.assertFalse(reply["ready"])
        stored = launch.inspect(self.installer, self.gog, "1234", "730")
        self.assertEqual(stored["status"], "registered")
        self.assertEqual(stored["shortcut"]["relative"], "comandos.exe")
        finish = launch.finalize(
            self.installer, self.gog, "1234", "730",
            0x90000101, "proton_experimental")
        self.assertTrue(finish["ok"], finish)
        self.assertEqual(launch.inspect(
            self.installer, self.gog, "1234", "730")["status"], "ready")

