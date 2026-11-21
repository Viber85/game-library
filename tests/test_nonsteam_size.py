"""Offline safety and behavior tests: no live Flatpak execution or filesystem crawling."""
import pathlib
import struct
import tempfile
import unittest
from unittest import mock

import main
import nonsteam_size


def text_field(name, value):
    return b"\x01" + name.encode() + b"\x00" + value.encode() + b"\x00"


def int_field(name, value):
    return b"\x02" + name.encode() + b"\x00" + struct.pack("<I", value)


def shortcut_blob(appid, name, exe, options=""):
    record = (int_field("appid", appid) + text_field("AppName", name)
              + text_field("Exe", exe) + text_field("LaunchOptions", options))
    return b"\x00shortcuts\x00\x000\x00" + record + b"\x08\x08\x08"


class NonSteamSizeTests(unittest.TestCase):
    def test_exact_shortcut_appid_and_name_not_other_program(self):
        data = shortcut_blob(0xFEDCBA98, "Chiaki", '"/usr/bin/flatpak"',
                             "run re.chiaki.Chiaki4deck")
        items = nonsteam_size.parse_binary_shortcuts(data)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["appid"], 0xFEDCBA98)
        self.assertEqual(items[0]["appname"], "Chiaki")
        self.assertEqual(items[0]["launchoptions"], "run re.chiaki.Chiaki4deck")
        with tempfile.TemporaryDirectory() as tmp:
            path = pathlib.Path(tmp) / "shortcuts.vdf"
            path.write_bytes(data)
            with mock.patch.object(nonsteam_size, "shortcut_path", return_value=path):
                self.assertIsNotNone(
                    nonsteam_size.matching_shortcut(0xFEDCBA98, "Chiaki", "123"))
                self.assertIsNone(
                    nonsteam_size.matching_shortcut(0xFEDCBA99, "Chiaki", "123"))
                self.assertIsNotNone(
                    nonsteam_size.matching_shortcut(0xFEDCBA98, "Renamed game", "123"))
        self.assertEqual(nonsteam_size.parse_binary_shortcuts(data[:14]), [])
        self.assertEqual(nonsteam_size.parse_binary_shortcuts(b"A" * (4_000_001)), [])

    def test_shortcut_discovery_uses_actual_steam_home_not_backend_home(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            steam_home = root / "gamer"
            path = steam_home / ".local/share/Steam/userdata/123/config/shortcuts.vdf"
            path.parent.mkdir(parents=True)
            path.write_bytes(shortcut_blob(0xFEDCBA98, "App", "/games/App.AppImage"))
            with mock.patch.object(nonsteam_size, "steam_homes",
                                   return_value=[root / "root", steam_home]):
                self.assertEqual(nonsteam_size.shortcut_path("123"), path)
                self.assertEqual(nonsteam_size.shortcut_path(""), path)
                self.assertIsNone(nonsteam_size.shortcut_path("999"))
                self.assertIsNone(nonsteam_size.shortcut_path("../123"))

    def test_flatpak_uses_shortcut_owners_home_and_drops_root(self):
        done = mock.Mock(returncode=0, stdout="12345")
        with (mock.patch.object(nonsteam_size.pathlib.Path, "is_file", return_value=True),
              mock.patch.object(nonsteam_size.os, "geteuid", return_value=0),
              mock.patch.object(nonsteam_size.subprocess, "run", return_value=done) as run):
            self.assertEqual(nonsteam_size.flatpak_installed_bytes(
                "org.example.App", {"_home": "/home/gamer", "_uid": 1000, "_gid": 1000}), 12345)
            self.assertEqual(run.call_args.kwargs["env"]["HOME"], "/home/gamer")
            self.assertEqual(run.call_args.kwargs["env"]["XDG_DATA_HOME"], "/home/gamer/.local/share")
            self.assertEqual(run.call_args.kwargs["user"], 1000)
            self.assertEqual(run.call_args.kwargs["group"], 1000)
            self.assertFalse(run.call_args.kwargs["shell"])

    def test_flatpak_detection_requires_real_run_and_valid_application_id(self):
        self.assertEqual(nonsteam_size.flatpak_id(
            nonsteam_size.command_tokens({
                "exe": '"/usr/bin/flatpak"',
                "launchoptions": "run --branch=stable re.chiaki.Chiaki4deck"
            })), "re.chiaki.Chiaki4deck")
        self.assertEqual(nonsteam_size.flatpak_id(
            nonsteam_size.command_tokens({
                "exe": "/usr/bin/flatpak",
                "launchoptions": "run --arch=x86_64 org.kde.Platform"
            })), "org.kde.Platform")
        self.assertEqual(nonsteam_size.flatpak_id(
            ["/home/deck/.local/share/flatpak/exports/bin/org.kde.krita"]),
            "org.kde.krita")
        self.assertIsNone(nonsteam_size.flatpak_id(
            ["/usr/bin/flatpak", "install", "org.kde.krita"]))
        self.assertIsNone(nonsteam_size.flatpak_id(
            ["/usr/bin/sh", "-c", "flatpak run org.kde.krita"]))
        self.assertIsNone(nonsteam_size.flatpak_id(
            ["/usr/bin/flatpak", "run", "org.kde.krita;rm"]))

    def test_appimage_reads_only_binary_file_without_directory_size_scans(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = pathlib.Path(tmp) / "Example Game.AppImage"
            path.write_bytes(b"x" * 5198)
            tokens = nonsteam_size.command_tokens(
                {"exe": '"' + str(path) + '"', "launchoptions": "--windowed"})
            self.assertEqual(nonsteam_size.appimage_file(tokens), 5198)
            self.assertIsNone(nonsteam_size.appimage_file(
                [str(path).replace(".AppImage", ".sh")]))
            self.assertIsNone(nonsteam_size.appimage_file(["/usr/bin/bash", str(path)]))
            path.unlink()
            self.assertIsNone(nonsteam_size.appimage_file(tokens))

    def test_flatpak_machine_readable_and_human_sizes(self):
        self.assertEqual(nonsteam_size.parse_flatpak_size("1048576\n"), 1048576)
        self.assertEqual(nonsteam_size.parse_flatpak_size("1.5 GiB"), 1610612736)
        self.assertEqual(nonsteam_size.parse_flatpak_size("450 MB"), 450000000)
        self.assertIsNone(nonsteam_size.parse_flatpak_size(""))
        self.assertIsNone(nonsteam_size.parse_flatpak_size("not installed"))
        self.assertIsNone(nonsteam_size.parse_flatpak_size("4 PiB"))
        completed = mock.Mock(returncode=0, stdout="1.5 GB")
        with (mock.patch.object(nonsteam_size.pathlib.Path, "is_file", return_value=True),
              mock.patch.object(nonsteam_size.subprocess, "run",
                                return_value=completed) as run):
            self.assertEqual(nonsteam_size.flatpak_installed_bytes(
                "re.chiaki.Chiaki4deck"), 1500000000)
            args, kwargs = run.call_args
            self.assertEqual(args[0],
                             ["/usr/bin/flatpak", "info", "--user",
                              "--show-size", "app/re.chiaki.Chiaki4deck"])
            self.assertFalse(kwargs["shell"])
            self.assertEqual(kwargs["timeout"], 5)
        with mock.patch.object(nonsteam_size.subprocess, "run") as run:
            self.assertIsNone(nonsteam_size.flatpak_installed_bytes("invalid; touch /tmp/x"))
            run.assert_not_called()

    def test_local_lookup_caches_and_never_queries_steam_store(self):
        item = {"appid": 81234567, "appname": "App",
                "exe": '"/usr/bin/flatpak"',
                "launchoptions": "run com.example.App"}
        service = nonsteam_size.NonSteamSizeService()
        with (mock.patch.object(nonsteam_size, "matching_shortcut", return_value=item),
              mock.patch.object(nonsteam_size, "flatpak_installed_bytes",
                                return_value=123456789) as read):
            one = service.lookup(81234567, "App", "12345")
            two = service.lookup(81234567, "App", "12345")
            self.assertEqual(one, {"status": "ok", "source": "flatpak",
                                    "size_bytes": 123456789})
            self.assertEqual(two, one)
            read.assert_called_once()
        for bad in (True, 0, -1, 0x100000000):
            self.assertEqual(service.lookup(bad, "App", "12345"),
                             {"status": "invalid"})
        self.assertEqual(service.lookup(81234567, "App", "../../escape"),
                         {"status": "invalid"})

    def test_real_plugin_only_calls_bundled_resolver_with_trusted_account_id(self):
        import asyncio
        with (mock.patch.object(main, "_load_nonsteam_size",
                                return_value=nonsteam_size),
              mock.patch.object(nonsteam_size, "matching_shortcut",
                                return_value=None)):
            plugin = main.Plugin()
            self.assertEqual(asyncio.run(
                plugin.nonsteam_install_size(123, "App", "123"))["status"],
                "unavailable")
            self.assertEqual(asyncio.run(
                plugin.nonsteam_install_size(0, "App"))["status"], "invalid")
            self.assertEqual(asyncio.run(
                plugin.nonsteam_install_size(123, "App", "../bad"))["status"],
                "invalid")


if __name__ == "__main__":
    unittest.main()
