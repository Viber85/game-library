import unittest

import main


class NativeSteamScreenThemeTests(unittest.TestCase):
    def test_native_running_game_and_controller_layout_css_scopes(self):
        bundle = main._builtin_theme_bundle("midnight")
        self.assertEqual(bundle["name"], "Midnight")
        self.assertIn("mainmenuapprunning_AppColumn", bundle["css"]["overlay"])
        self.assertNotIn("mainmenuapprunning_AppColumn", bundle["css"]["main"])
        # Steam Input's pictured read-only overview keeps Valve's original
        # colors; only the separate binding editor continues to use Midnight.
        import re
        summary_css = (main.BASE / "system-theme" / "steam-input.css").read_text(encoding="utf-8")
        paint_rules = re.sub(r"/\\*[\\s\\S]*?\\*/", "", summary_css)
        self.assertNotIn("controllerconfiguratorsummary_", paint_rules)
        for surface in ("main", "overlay"):
            # The shared DialogButton CSS opts out inside the native overview.
            self.assertIn(
                ':not(:is([class*="controllerconfiguratorsummary_ControllerConfiguratorSummary"] *))',
                bundle["css"][surface],
            )
        self.assertIn("controllerconfigurator_ControllerConfiguratorMain",
                      bundle["css"]["main"])
        self.assertIn("controllerconfigurator_ControllerConfiguratorMain",
                      bundle["css"]["overlay"])
        self.assertIn("background:#163a5e", bundle["css"]["overlay"])
        self.assertIn("--glm-bg-deep", bundle["css"]["main"])
        self.assertIn("audio_VolumePopin", bundle["css"]["main"])
        self.assertIn("audio_VolumePopin", bundle["css"]["overlay"])
        self.assertIn("gamepadcontextmenu_Focused", bundle["css"]["overlay"])
        self.assertIn("gamepadcontextmenu_Focused", bundle["css"]["main"])
        self.assertIn("BasicUIContextMenu", bundle["css"]["main"])
        self.assertIn('[role="menuitem"]', bundle["css"]["main"])
        self.assertIn("data-glm-settings-root", (main.BASE / "system-theme" / "settings-focus.css").read_text(encoding="utf-8"))
        self.assertIn("border-color:transparent !important;", bundle["css"]["main"])
        self.assertIn("html:has(.BasicUI .PageListColumn):has(.BasicUI .DialogControlsSection)", bundle["css"]["main"])
        self.assertIn("--glm-decky-observed-layout:1;", bundle["css"]["main"])
        self.assertNotIn("settings-focus", bundle["css"]["overlay"])
        self.assertIn("data-glm-settings-special-row", bundle["css"]["main"])
        self.assertNotIn("data-glm-settings-special-row", bundle["css"]["overlay"])
        self.assertIn("data-glm-decky-settings", bundle["css"]["main"])
        self.assertNotIn("data-glm-decky-settings", bundle["css"]["overlay"])
        self.assertIn(".BasicUI .PageListColumn :is(", bundle["css"]["main"])
        self.assertIn("background:#163a5e !important;", bundle["css"]["main"])
        self.assertNotIn("settings-gamepad-focus", bundle["css"]["overlay"])

    def test_bundled_source_files_exist_and_are_small(self):
        for filename in ("running-menu.css", "steam-input.css", "volume.css", "power-menu.css", "settings-focus.css", "settings-special.css", "decky-settings.css", "settings-gamepad-focus.css"):
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
