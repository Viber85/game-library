import unittest

import main


class NativeSteamScreenThemeTests(unittest.TestCase):
    def test_native_running_game_and_controller_layout_css_scopes(self):
        bundle = main._builtin_theme_bundle("midnight")
        self.assertEqual(bundle["name"], "Midnight")
        self.assertIn("mainmenuapprunning_AppColumn", bundle["css"]["overlay"])
        self.assertNotIn("mainmenuapprunning_AppColumn", bundle["css"]["main"])
        self.assertIn("controllerconfiguratorsummary_ControllerConfiguratorSummary",
                      bundle["css"]["main"])
        self.assertIn("controllerconfiguratorsummary_ControllerConfiguratorSummary",
                      bundle["css"]["overlay"])
        self.assertIn("controllerconfigurator_ControllerConfiguratorMain",
                      bundle["css"]["main"])
        self.assertIn("controllerconfigurator_ControllerConfiguratorMain",
                      bundle["css"]["overlay"])
        self.assertIn("background:#163a5e", bundle["css"]["overlay"])
        self.assertIn("--glm-bg-deep", bundle["css"]["main"])
        self.assertIn("audio_VolumePopin", bundle["css"]["main"])
        self.assertIn("audio_VolumePopin", bundle["css"]["overlay"])
        self.assertIn("gamepadcontextmenu_Focused", bundle["css"]["overlay"])
        self.assertNotIn("gamepadcontextmenu_Focused", bundle["css"]["main"])

    def test_bundled_source_files_exist_and_are_small(self):
        for filename in ("running-menu.css", "steam-input.css", "volume.css", "power-menu.css"):
            path = main.BASE / "system-theme" / filename
            self.assertTrue(path.is_file(), filename)
            self.assertLess(path.stat().st_size, 100_000)
            css = path.read_text(encoding="utf-8")
            self.assertNotIn("pointer-events:", css)
            self.assertNotIn("display:none", css)
            self.assertNotIn("position:fixed", css)

    def test_missing_file_fails_closed_without_unsafe_external_paths(self):
        with self.assertRaises(ValueError):
            main._builtin_theme_bundle("../untrusted")


if __name__ == "__main__":
    unittest.main()
