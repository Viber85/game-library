"""Destructive cleanup guards: never follow symlinks or touch other apps."""
import importlib.util
import pathlib
import tempfile
import unittest

MODULE = pathlib.Path(__file__).resolve().parents[1] / "steam_cancel_cleanup.py"
spec = importlib.util.spec_from_file_location("steam_cancel_cleanup_tested", MODULE)
cleanup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cleanup)


class CancelCleanupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name) / "SteamLibrary"
        (self.root / "steamapps/compatdata/730/pfx/drive_c").mkdir(parents=True)
        (self.root / "steamapps/shadercache/730").mkdir(parents=True)
        (self.root / "steamapps/compatdata/570/pfx").mkdir(parents=True)
        (self.root / "steamapps/shadercache/570").mkdir(parents=True)
        (self.root / "steamapps/compatdata/730/pfx/drive_c/save.txt").write_text("save")

    def test_exact_app_only(self):
        result = cleanup.clean_cancelled_app_data(730, [self.root])
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["status"], "cleaned")
        self.assertFalse((self.root / "steamapps/compatdata/730").exists())
        self.assertFalse((self.root / "steamapps/shadercache/730").exists())
        self.assertTrue((self.root / "steamapps/compatdata/570/pfx").is_dir())
        self.assertTrue((self.root / "steamapps/shadercache/570").is_dir())

    def test_manifest_prevents_prefix_deletion(self):
        manifest = self.root / "steamapps/appmanifest_730.acf"
        manifest.write_text('"appid" "730"')
        result = cleanup.clean_cancelled_app_data(730, [self.root])
        self.assertEqual(result["status"], "steam-busy")
        self.assertTrue((self.root / "steamapps/compatdata/730").exists())

    def test_partial_download_blocks_cleanup(self):
        (self.root / "steamapps/downloading/730").mkdir(parents=True)
        result = cleanup.clean_cancelled_app_data(730, [self.root])
        self.assertEqual(result["status"], "steam-busy")
        self.assertTrue((self.root / "steamapps/compatdata/730").exists())

    def test_rejects_wrong_ids(self):
        for value in (0, -1, 0x80000000, True, "730", 1.5):
            with self.subTest(value=value):
                self.assertFalse(cleanup.clean_cancelled_app_data(value, [self.root])["ok"])
        self.assertTrue((self.root / "steamapps/compatdata/730").is_dir())

    def test_symlink_is_not_followed(self):
        external = pathlib.Path(self.temp.name) / "important"
        external.mkdir()
        (external / "save.txt").write_text("keep")
        target = self.root / "steamapps/compatdata/730"
        import shutil
        shutil.rmtree(target)
        target.symlink_to(external, target_is_directory=True)
        result = cleanup.clean_cancelled_app_data(730, [self.root])
        self.assertEqual(result["status"], "partial")
        self.assertTrue(target.is_symlink())
        self.assertEqual((external / "save.txt").read_text(), "keep")

    def test_all_libraries_must_be_not_busy(self):
        another = pathlib.Path(self.temp.name) / "OtherLibrary"
        (another / "steamapps").mkdir(parents=True)
        (another / "steamapps/appmanifest_730.acf").write_text("installed")
        result = cleanup.clean_cancelled_app_data(730, [self.root, another])
        self.assertEqual(result["status"], "steam-busy")
        self.assertTrue((self.root / "steamapps/compatdata/730").exists())


if __name__ == "__main__":
    unittest.main()
