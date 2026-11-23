"""Offline installer tests: no Steam changes, network calls or game downloads."""
import importlib.util
import pathlib
import tempfile
import types
import unittest
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("game_library_gog_install_test",
                                            ROOT / "gog_install.py")
install = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(install)


class GogInstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        install._STATES.clear()
        install._JOBS.clear()
        self.gog = types.SimpleNamespace(
            _account=lambda v: v if v == "1234" else
                (_ for _ in ()).throw(ValueError("Bad account")),
            library=lambda _: {"ok": True, "games": [{"id": "730", "title": "Test"}]},
        )

    def test_only_owned_numeric_product_ids(self):
        self.assertEqual(install._account_and_game(self.gog, "1234", "730"),
                         ("1234", "730"))
        for value in ["../../etc", "1;rm", "570", "", "12/123"]:
            with self.assertRaises(ValueError):
                install._account_and_game(self.gog, "1234", value)

    def test_platform_info_validation_and_account_isolation(self):
        self.assertEqual(install._size_info({"size": {
            "*": {"download_size": 20, "disk_size": 42}}}), 42)
        self.assertIsNone(install._size_info({"size": {}}))
        with mock.patch.object(install, "_gogdl", return_value=pathlib.Path("/bin/gogdl")), \
             mock.patch.object(install, "_auth_file", return_value=(
                pathlib.Path("/private/auth.json"), types.SimpleNamespace(pw_uid=1000,pw_gid=1000))), \
             mock.patch.object(install, "_locations", return_value=[]), \
             mock.patch.object(install, "_execute") as execute:
            execute.return_value = types.SimpleNamespace(returncode=0,
                stdout='{"folder_name":"Test Game","size":{"*":{"disk_size":1024}}}')
            result = install.preflight(self.gog, ROOT, "1234", "730")
            self.assertTrue(result["ok"])
            self.assertEqual(result["size_bytes"], 1024)
            args = execute.call_args.args[0]
            self.assertEqual(args[0], "/bin/gogdl")
            self.assertEqual(args[3:6], ["info","730","--platform"])
            self.assertNotIn("token", " ".join(args).lower())
            execute.return_value.stdout = '{"folder_name":"../bad"}'
            self.assertFalse(install.preflight(self.gog, ROOT, "1234", "730")["ok"])
            execute.return_value.stdout = '{"folder_name":"a/b"}'
            self.assertFalse(install.preflight(self.gog, ROOT, "1234", "730")["ok"])

    def test_unlisted_location_never_creates_paths(self):
        with mock.patch.object(install, "_preflight", return_value={
            "ok": True, "folder":"Test Game", "size_bytes": 100,
            "locations":[{"key":"internal","path":self.temp.name,"free_bytes":10**9}]}):
            result = install.start(self.gog, ROOT, "1234", "730", "../../etc")
        self.assertFalse(result["ok"])
        self.assertEqual(install.snapshot("1234","730")["status"], "idle")

    def test_not_enough_space_or_existing_game_never_overwritten(self):
        root = pathlib.Path(self.temp.name)
        plan = {"ok": True, "folder":"Test Game", "size_bytes": 8*1024**3,
                "locations":[{"key":"internal","path":str(root),
                              "free_bytes":128*1024**2}]}
        with mock.patch.object(install,"_preflight",return_value=plan):
            self.assertIn("Not enough",install.start(
                self.gog,ROOT,"1234","730","internal")["reason"])
        plan["size_bytes"]=1
        plan["locations"][0]["free_bytes"]=2*1024**3
        (root/"Test Game").mkdir()
        with mock.patch.object(install,"_preflight",return_value=plan):
            result=install.start(self.gog,ROOT,"1234","730","internal")
        self.assertFalse(result["ok"])
        self.assertTrue((root/"Test Game").is_dir())

    def test_only_owned_process_group_can_be_cancelled(self):
        key=("1234","730")
        install._STATES[key]={"status":"downloading","percent":12}
        mock_process=types.SimpleNamespace(pid=44444)
        install._JOBS[key]=mock_process
        with mock.patch.object(install.os, "killpg") as signal_call:
            result=install.cancel("1234","730")
            self.assertTrue(result["ok"])
            signal_call.assert_called_once_with(44444,install.signal.SIGTERM)
            self.assertTrue(install._STATES[key]["cancel_requested"])
            self.assertFalse(install.cancel("5678","730")["ok"])

    def test_progress_is_read_only_and_does_not_invent_speed(self):
        self.assertIsNotNone(install._PROGRESS.search(
            "= Progress: 23.12 12/50, Running for: 00:01:10"))
        self.assertIsNotNone(install._RATE.search(
            " + Download\t- 10.15 MiB/s (raw) / 20.1 MiB/s"))
        self.assertEqual(install.snapshot("1234","730")["status"],"idle")
