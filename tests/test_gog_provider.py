"""Offline regression tests for Game Library's independent GOG provider."""
import importlib.util
import json
import os
import socket
import ssl
import sys
import types
import urllib.error
import urllib.request
import pathlib
import tempfile
import time
import unittest
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("game_library_own_gog_test", ROOT / "gog.py")
gog = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gog)


class GogPhaseOneTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = mock.patch.dict(os.environ, {"DECKY_PLUGIN_SETTINGS_DIR": self.temp.name})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.temp.cleanup()

    def test_rejects_redirect_from_other_hosts(self):
        with self.assertRaises(gog.GogError):
            gog._authorization_code("https://evil.example/on_login_success?code=abcdefghijklmnop")
        with self.assertRaises(gog.GogError):
            gog._authorization_code("not-a-token")
        self.assertEqual(
            gog._authorization_code("https://embed.gog.com/on_login_success?origin=client&code=abcdefghijklmnop"),
            "abcdefghijklmnop",
        )

    def test_different_steam_accounts_never_share_gog_data(self):
        gog._atomic_json(gog._folder("1234") / "session.json",
                         {"access": "abc", "refresh": "def", "expires_at": time.time() + 2000})
        self.assertTrue(gog.status("1234")["connected"])
        self.assertFalse(gog.status("5678")["connected"])
        if os.name != "nt":
            self.assertEqual((gog._folder("1234") / "session.json").stat().st_mode & 0o777, 0o600)
        self.assertTrue(gog.disconnect("1234")["ok"])
        self.assertFalse(gog.status("1234")["connected"])

    def test_paginated_owned_products_and_cache(self):
        gog._atomic_json(gog._folder("42") / "session.json",
                         {"access": "abc", "refresh": "def", "expires_at": time.time() + 2000})
        pages = {
            1: {"totalPages": 2, "products": [
                {"id": 111, "title": "Zelda Test", "image": "//images-1.gog-statics.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
                {"id": 222, "title": "Alpha Game", "image": "https://evil.example/image"}]},
            2: {"totalPages": 2, "products": [
                {"id": 111, "title": "duplicate"},
                {"id": 333, "title": "Beta Game"}]},
        }

        def fake_http(url, access=None):
            page = int(url.rsplit("page=", 1)[1])
            self.assertEqual(access, "abc")
            return pages[page]

        with mock.patch.object(gog, "_http_json", side_effect=fake_http):
            reply = gog.sync("42")
        self.assertTrue(reply["ok"])
        self.assertEqual(reply["count"], 3)
        result = gog.library("42")
        self.assertEqual([x["title"] for x in result["games"]],
                         ["Alpha Game", "Beta Game", "Zelda Test"])
        self.assertEqual(result["games"][0]["image"], "")
        self.assertEqual(result["games"][2]["image"],
                         "https://images-1.gog-statics.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_glx_vertical_cover.webp")
        self.assertEqual(result["games"][2]["imageFallback"],
                         "https://images-1.gog-statics.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_196.jpg")
        self.assertFalse(result["needs_art_refresh"])

    def test_failed_sync_preserves_previous_complete_cache(self):
        gog._atomic_json(gog._folder("42") / "session.json",
                         {"access": "abc", "refresh": "def", "expires_at": time.time() + 2000})
        old = {"games": [{"id": "1", "title": "Saved", "image": "", "background": ""}],
               "synced_at": 101}
        gog._atomic_json(gog._folder("42") / "library.json", old)
        with mock.patch.object(gog, "_http_json", side_effect=gog.GogError("Offline")):
            reply = gog.sync("42")
        self.assertFalse(reply["ok"])
        self.assertEqual(gog.library("42")["games"], old["games"])
        self.assertEqual(gog.library("42")["synced_at"], 101)

    def test_uses_decky_certifi_when_present_and_keeps_tls_verified(self):
        """Decky may bundle certifi even when system Python lacks a CA store."""
        bundle = os.path.join(self.temp.name, "trusted.pem")
        with open(bundle, "w", encoding="ascii") as file:
            file.write("fake test CA content")
        context = object()
        fake_certifi = types.SimpleNamespace(where=lambda: bundle)
        gog._TLS_CONTEXT = None
        try:
            with mock.patch.dict(sys.modules, {"certifi": fake_certifi}), \
                 mock.patch.object(gog.ssl, "create_default_context",
                                   return_value=context) as create:
                self.assertIs(gog._tls_context(), context)
                create.assert_called_once_with(cafile=bundle)
                self.assertIs(gog._tls_context(), context)
                create.assert_called_once()
        finally:
            gog._TLS_CONTEXT = None

    def test_backend_https_uses_verified_context_and_never_logs_codes(self):
        sensitive_code = "sensitive1234oneusecode"
        url = "https://auth.gog.com/token?code=" + sensitive_code
        fake_response = mock.MagicMock()
        fake_response.status = 200
        fake_response.read.return_value = b'{"access_token":"abc","refresh_token":"xyz"}'
        fake_response.__enter__.return_value = fake_response
        context = object()
        with mock.patch.object(gog, "_tls_context", return_value=context), \
             mock.patch.object(urllib.request, "urlopen",
                               return_value=fake_response) as request:
            result = gog._http_json(url)
        self.assertEqual(result["access_token"], "abc")
        self.assertIs(request.call_args.kwargs["context"], context)
        self.assertEqual(request.call_args.kwargs["timeout"], 18)

        bad_request = urllib.error.HTTPError(
            url, 400, "Bad Request", {}, None
        )
        with mock.patch.object(gog, "_tls_context", return_value=context), \
             mock.patch.object(urllib.request, "urlopen", side_effect=bad_request), \
             self.assertRaises(gog.GogError) as failure:
            gog._http_json(url)
        self.assertIn("token exchange", str(failure.exception))
        self.assertIn("fresh one-use code", str(failure.exception))
        self.assertNotIn(sensitive_code, str(failure.exception))

    def test_gog_tls_dns_and_timeout_errors_are_distinguishable(self):
        errors = [
            (urllib.error.URLError(ssl.SSLCertVerificationError("fake TLS error")),
             "certificate validation failed"),
            (urllib.error.URLError(socket.gaierror(-3, "fake DNS error")),
             "DNS could not resolve"),
            (urllib.error.URLError(TimeoutError("fake timeout")),
             "connection timed out"),
            (urllib.error.URLError(ConnectionRefusedError("fake refused")),
             "connection was refused"),
        ]
        with mock.patch.object(gog, "_tls_context", return_value=object()):
            for error, expected in errors:
                with self.subTest(expected=expected), \
                     mock.patch.object(urllib.request, "urlopen", side_effect=error), \
                     self.assertRaises(gog.GogError) as failure:
                    gog._http_json("https://auth.gog.com/token?code=secret123")
                self.assertIn(expected, str(failure.exception))
                self.assertIn("GOG token exchange", str(failure.exception))
                self.assertNotIn("secret123", str(failure.exception))

    def test_connection_failure_does_not_erase_existing_cached_games(self):
        account = "4242"
        session = {"access": "test-access", "refresh": "refresh",
                   "expires_at": time.time() + 2000}
        gog._atomic_json(gog._folder(account) / "session.json", session)
        cache = {"games": [{"id": "1", "title": "Existing", "image": ""}],
                 "synced_at": 111}
        gog._atomic_json(gog._folder(account) / "library.json", cache)
        with mock.patch.object(gog, "_http_json",
                               side_effect=gog.GogError("GOG library synchronization: DNS failed")):
            result = gog.sync(account)
        self.assertFalse(result["ok"])
        self.assertEqual(gog.library(account)["games"], cache["games"])

    def test_gog_artwork_url_validation_and_legacy_cache_refresh(self):
        sha = "a" * 64
        cases = (
            ("//images-1.gog.com/" + sha,
             "https://images-1.gog.com/" + sha + "_glx_vertical_cover.webp"),
            ("https://images-2.gog-statics.com/" + sha + "_196.jpg",
             "https://images-2.gog-statics.com/" + sha + "_196.jpg"),
            (sha, "https://images.gog-statics.com/" + sha + "_glx_vertical_cover.webp"),
        )
        for value, expected in cases:
            with self.subTest(value=value):
                self.assertEqual(gog._gog_image(value), expected)
        for invalid in (
            "//images.evil.com/" + sha,
            "https://images-1.gog.com.evil.org/" + sha,
            "http://images.gog-statics.com/" + sha,
            "https://images.gog-statics.com/../secret.png",
            "https://example.com/" + sha,
        ):
            with self.subTest(invalid=invalid):
                self.assertEqual(gog._gog_image(invalid), "")

        account = "321"
        gog._atomic_json(gog._folder(account) / "session.json", {
            "access": "abc", "refresh": "xyz", "expires_at": time.time()+1200})
        gog._atomic_json(gog._folder(account) / "library.json", {
            "games": [{"id": "1", "title": "Owned", "image": "", "background": ""}],
            "synced_at": 100,
        })
        self.assertTrue(gog.library(account)["needs_art_refresh"])
        with mock.patch.object(gog, "_http_json", return_value={
            "totalPages": 1, "products": [{
                "id": 1, "title": "Owned", "image": "//images-1.gog.com/" + sha
            }]
        }):
            self.assertTrue(gog.sync(account)["ok"])
        self.assertFalse(gog.library(account)["needs_art_refresh"])
        self.assertIn("_glx_vertical_cover.webp", gog.library(account)["games"][0]["image"])

    def test_no_foreign_plugin_or_steam_folder_lookup(self):
        src = (ROOT / "gog.py").read_text(encoding="utf-8")
        self.assertNotIn("~/.config/unifideck", src.lower())
        self.assertNotIn("shortcuts.vdf", src.lower())
        self.assertNotIn("gogdl_credentials.json", src.lower())


if __name__ == "__main__":
    unittest.main()
