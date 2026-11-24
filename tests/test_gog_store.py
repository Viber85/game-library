"""Offline GOG Store link validation and owned-product scoping."""
import importlib.util
import pathlib
import types
import unittest

ROOT=pathlib.Path(__file__).resolve().parent.parent
SPEC=importlib.util.spec_from_file_location("gog_store_test",ROOT/"gog_store.py")
store=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(store)


class GogStoreTests(unittest.TestCase):
    def setUp(self):
        store._CACHE.clear()
        self.calls=[]
        self.installer=types.SimpleNamespace(
            _account_and_game=lambda gog,account,product:
                (account,product) if account=="1234" and product=="730" else
                (_ for _ in ()).throw(ValueError("Not owned"))
        )
        def fetch(url):
            self.calls.append(url)
            return {"id":730,"title":"Commandos - Behind Enemy Lines",
                    "slug":"commandos_behind_enemy_lines"}
        self.gog=types.SimpleNamespace(_http_json=fetch)

    def test_verified_product_id_resolves_actual_catalog_slug(self):
        result=store.lookup(self.gog,self.installer,"1234","730")
        self.assertEqual(result,{"ok":True,
            "url":"https://www.gog.com/en/game/commandos_behind_enemy_lines"})
        self.assertEqual(self.calls,[
            "https://api.gog.com/products/730?locale=en-US"])
        self.assertEqual(store.lookup(self.gog,self.installer,"1234","730"),result)
        self.assertEqual(len(self.calls),1)

    def test_owned_product_validation_prevents_other_store_queries(self):
        for account,product in (("5678","730"),("1234","999"),
                                ("1234","../../../etc")):
            self.calls.clear()
            self.assertFalse(store.lookup(self.gog,self.installer,account,product)["ok"])
            self.assertEqual(self.calls,[])

    def test_mismatched_catalog_record_is_rejected(self):
        for data in (
            {"id":999,"slug":"another_game"},
            {"id":730,"slug":"../../../evil"},
            {"id":730,"slug":"a?next=https://evil.test"},
            {"id":730,"slug":None},
            {},
        ):
            self.assertIsNone(store._validated_link("730",data))

    def test_api_failure_does_not_guess_slug_from_title(self):
        self.gog._http_json=lambda url:(_ for _ in ()).throw(RuntimeError("offline"))
        result=store.lookup(self.gog,self.installer,"1234","730")
        self.assertFalse(result["ok"])
        self.assertNotIn("url",result)
