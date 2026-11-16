import pathlib
import tempfile
import unittest
from unittest import mock
from types import SimpleNamespace

import main
import system_status

class SystemStatusTests(unittest.TestCase):
    def test_battery_reads_real_capacity_and_external_power(self):
        with tempfile.TemporaryDirectory() as temp:
            root=pathlib.Path(temp)
            bat=root/"BAT0"
            ac=root/"AC"
            bat.mkdir()
            ac.mkdir()
            for file,value in {
                bat/"type":"Battery",bat/"capacity":"72",
                bat/"status":"Charging",ac/"type":"Mains",ac/"online":"1"
            }.items():
                file.write_text(value)
            with mock.patch.object(system_status,"POWER_SUPPLY",root):
                self.assertEqual(system_status.battery_status(),
                    {"percent":72,"charging":True,"plugged":True})
                (bat/"capacity").write_text("250")
                self.assertIsNone(system_status.battery_status())

    def test_wifi_reports_connection_and_signal_without_ssid(self):
        def runner(argv):
            command=" ".join(argv)
            if command=="nmcli radio wifi":return "enabled"
            if command=="nmcli -t -f DEVICE,TYPE,STATE device status":
                return "wlan0:wifi:connected\neth0:ethernet:disconnected"
            if "IN-USE,SIGNAL" in command:return "*:83\n:45"
            return None
        with mock.patch.object(system_status,"_command",side_effect=runner):
            self.assertEqual(system_status.wifi_status(),
                {"enabled":True,"connected":True,"signal":83})
        with mock.patch.object(system_status,"_command",return_value=None):
            self.assertIsNone(system_status.wifi_status())

    def test_bluetooth_rfkill_reads_state_without_modifying_radio(self):
        with tempfile.TemporaryDirectory() as temp:
            root=pathlib.Path(temp)
            radio=root/"rfkill0"
            radio.mkdir()
            (radio/"type").write_text("bluetooth")
            (radio/"soft").write_text("1")
            (radio/"hard").write_text("0")
            with mock.patch.object(system_status,"RFKILL",root):
                self.assertEqual(system_status.bluetooth_status(),{"enabled":False})
                (radio/"soft").write_text("0")
                self.assertEqual(system_status.bluetooth_status(),{"enabled":True})

    def test_decky_backend_returns_unknown_for_missing_hardware(self):
        with mock.patch.object(main,"_load_system_status",
                return_value=SimpleNamespace(get_system_status=lambda:{
                    "battery":None,"wifi":None,"bluetooth":None,
                })):
            import asyncio
            self.assertEqual(asyncio.run(main.Plugin().get_system_status()),
                             {"battery":None,"wifi":None,"bluetooth":None})

if __name__=="__main__":
    unittest.main()
