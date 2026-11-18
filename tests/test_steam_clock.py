import asyncio
import json
import pathlib
import tempfile
import unittest
from unittest import mock

import main


def vdf_clock(value):
    inner = json.dumps({"b24HourClock": value, "other": "test"}, separators=(",", ":"))
    escaped = json.dumps(inner)
    return '"UserLocalConfigStore"\n{\n "FriendsUIJSON" ' + escaped + '\n}\n'


class SteamClockTests(unittest.TestCase):
    def test_steam_24h_config_read_and_explicit_12h(self):
        self.assertIs(main._steam_clock_setting_from_vdf(vdf_clock(True)), True)
        self.assertIs(main._steam_clock_setting_from_vdf(vdf_clock(False)), False)
        self.assertIs(main._steam_clock_setting_from_vdf(vdf_clock("1")), True)
        self.assertIs(main._steam_clock_setting_from_vdf(vdf_clock("0")), False)
        self.assertIs(main._steam_clock_setting_from_vdf('"b24HourClock" "1"'), True)
        self.assertIs(main._steam_clock_setting_from_vdf('"b24HourClock" "0"'), False)
        self.assertIsNone(main._steam_clock_setting_from_vdf(vdf_clock("unknown")))
        self.assertIsNone(main._steam_clock_setting_from_vdf('"OtherSetting" "1"'))

    def test_only_active_account_config_is_read_without_writing(self):
        with tempfile.TemporaryDirectory() as temp:
            path = pathlib.Path(temp) / "localconfig.vdf"
            data = vdf_clock(False)
            path.write_text(data, encoding="utf-8")
            with mock.patch.object(main, "_steam_clock_config_paths",
                                   return_value=iter([path])):
                self.assertIs(main._get_steam_clock_format("12345"), False)
            self.assertEqual(path.read_text(encoding="utf-8"), data)
            for invalid in ("../../bad", "", "0", "123456789012345", "-7"):
                self.assertIsNone(main._get_steam_clock_format(invalid))

    def test_backend_api_returns_only_clock_preference_or_unknown(self):
        with mock.patch.object(main, "_get_steam_clock_format", return_value=True):
            response = asyncio.run(main.Plugin().get_steam_clock_format("12345"))
            self.assertEqual(response, {"hour24": True})
        with mock.patch.object(main, "_get_steam_clock_format", return_value=None):
            response = asyncio.run(main.Plugin().get_steam_clock_format("12345"))
            self.assertEqual(response, {"hour24": None})


if __name__ == "__main__":
    unittest.main()
