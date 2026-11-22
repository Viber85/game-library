"""Offline regression tests for our one-time LAN phone GOG handoff."""
import base64
import importlib.util
import pathlib
import re
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from unittest import mock

BASE = pathlib.Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("game_library_gog_phone_tests", BASE / "gog_phone.py")
phone = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(phone)


class FakeGog:
    class GogError(Exception):
        pass

    def __init__(self):
        self.calls = []

    def _account(self, value):
        if not isinstance(value, str) or not re.fullmatch(r"[1-9][0-9]{0,11}", value):
            raise self.GogError("Steam account unavailable")
        return value

    def login_url(self):
        return ("https://auth.gog.com/auth?client_id=46899977096215655"
                "&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient"
                "&response_type=code")

    def connect(self, account, code):
        self.calls.append((account, code))
        if code == "abcdef1234567890ABCDEF":
            return {"ok": True, "connected": True, "count": 14}
        return {"ok": False, "reason": "Code rejected"}


class GogPhoneTests(unittest.TestCase):
    def setUp(self):
        phone.shutdown()
        self.fake_gog = FakeGog()
        original = phone._local_module

        def loader(name):
            return self.fake_gog if name == "gog" else original(name)

        self.patches = [
            mock.patch.object(phone, "_lan_ipv4", return_value="127.0.0.1"),
            mock.patch.object(phone, "_local_module", side_effect=loader),
        ]
        for patcher in self.patches:
            patcher.start()

    def tearDown(self):
        phone.shutdown()
        for patcher in reversed(self.patches):
            patcher.stop()

    def test_gog_callback_validation_refuses_forged_domains_and_bad_codes(self):
        self.assertEqual(phone._validated_code("abcdef1234567890ABCDEF"),
                         "abcdef1234567890ABCDEF")
        url = ("https://embed.gog.com/on_login_success?origin=client"
               "&code=abcdef1234567890ABCDEF")
        self.assertEqual(phone._validated_code(url), "abcdef1234567890ABCDEF")
        for value in (
            "https://attacker.example/on_login_success?origin=client&code=abcdef1234567890ABCDEF",
            "https://embed.gog.com.evil.example/on_login_success?origin=client&code=abcdef1234567890ABCDEF",
            "http://embed.gog.com/on_login_success?origin=client&code=abcdef1234567890ABCDEF",
            "https://embed.gog.com/on_login_success?origin=no&code=abcdef1234567890ABCDEF",
            url + "&code=extra12345678",
            "not valid",
        ):
            with self.subTest(value=value), self.assertRaises(ValueError):
                phone._validated_code(value)

    def test_qr_page_is_local_and_send_success_code_once(self):
        pair = phone.start("123")
        self.assertTrue(pair["ok"], pair)
        self.assertEqual(pair["phase"], "waiting")
        self.assertTrue(pair["url"].startswith("http://127.0.0.1:"))
        svg = base64.b64decode(pair["qr"])
        ET.fromstring(svg)
        self.assertIn(b"<svg", svg)
        with urllib.request.urlopen(pair["url"], timeout=4) as response:
            content = response.read().decode()
            self.assertIn("Open GOG sign-in", content)
            self.assertIn("Connect GOG to Game Library", content)
            self.assertNotIn("Unifideck", content)
            self.assertEqual(response.headers.get("Referrer-Policy"), "no-referrer")
            self.assertIn("no-store", response.headers.get("Cache-Control"))
        good = "https://embed.gog.com/on_login_success?origin=client&code=abcdef1234567890ABCDEF"
        submit = pair["url"] + "submit"
        bad = urllib.parse.urlencode({"gog_url": "https://evil.example/?code=abcdef1234567890ABCDEF"}).encode()
        with self.assertRaises(urllib.error.HTTPError) as failure:
            urllib.request.urlopen(submit, data=bad, timeout=4)
        self.assertEqual(failure.exception.code, 400)
        self.assertEqual(len(self.fake_gog.calls), 0)

        data = urllib.parse.urlencode({"gog_url": good}).encode()
        with urllib.request.urlopen(submit, data=data, timeout=4) as response:
            self.assertEqual(response.status, 202)
            self.assertNotIn(b"abcdef1234567890ABCDEF", response.read())

        final = None
        for _ in range(100):
            final = phone.status("123")
            if final["phase"] == "connected":
                break
            time.sleep(.05)
        self.assertEqual(final["phase"], "connected", final)
        self.assertEqual(final["count"], 14)
        self.assertEqual(self.fake_gog.calls, [("123", "abcdef1234567890ABCDEF")])
        self.assertEqual(final["qr"], "")
        self.assertEqual(final["url"], "")
        self.assertEqual(phone.status("999"), {"ok": True, "phase": "idle"})
        self.assertTrue(phone.cancel("123")["ok"])
        self.assertEqual(phone.status("123")["phase"], "idle")

    def test_pairing_rejects_different_host_header_and_csrf_origin(self):
        pair = phone.start("123")
        wrong_host = urllib.request.Request(pair["url"], headers={"Host": "evil.example"})
        with self.assertRaises(urllib.error.HTTPError) as failure:
            urllib.request.urlopen(wrong_host, timeout=4)
        self.assertEqual(failure.exception.code, 404)
        data = urllib.parse.urlencode({"gog_url": "abcdef1234567890ABCDEF"}).encode()
        wrong_origin = urllib.request.Request(pair["url"] + "submit",
            data=data, headers={"Origin": "https://evil.example"})
        with self.assertRaises(urllib.error.HTTPError) as failure:
            urllib.request.urlopen(wrong_origin, timeout=4)
        self.assertEqual(failure.exception.code, 403)
        self.assertEqual(self.fake_gog.calls, [])

    def test_expired_and_cancelled_pairs_refuse_new_requests(self):
        pair = phone.start("123")
        first_token = pair["url"]
        self.assertEqual(phone.start("123")["url"], first_token)
        phone._ACTIVE.expire()
        self.assertEqual(phone.status("123")["phase"], "expired")
        second = phone.start("123")
        self.assertTrue(second["ok"])
        self.assertNotEqual(second["url"], first_token)
        self.assertTrue(phone.cancel("123")["ok"])
        self.assertEqual(phone.status("123")["phase"], "idle")

    def test_no_lan_interface_fails_without_public_relay(self):
        with mock.patch.object(phone, "_lan_ipv4", return_value=None):
            status = phone.start("123")
            self.assertFalse(status["ok"])
            self.assertIn("Wi-Fi", status["reason"])

    def test_login_passwords_never_enter_phone_service(self):
        source = (BASE / "gog_phone.py").read_text(encoding="utf-8")
        self.assertNotIn("unifideck", source.lower())
        self.assertNotIn("document.cookie", source)
        self.assertNotIn("googleapis.com", source)
        self.assertIn("ThreadingHTTPServer((ip, 0)", source)
        self.assertIn("secrets.token_urlsafe(24)", source)


if __name__ == "__main__":
    unittest.main()
