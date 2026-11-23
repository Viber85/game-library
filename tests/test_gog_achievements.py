"""Tests for authenticated, owned-GOG-game achievement counts."""
import importlib.util
import pathlib
import types
import unittest

ROOT=pathlib.Path(__file__).resolve().parent.parent
SPEC=importlib.util.spec_from_file_location("gog_achievements_test",ROOT/"gog_achievements.py")
a=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(a)


class GogAchievementTests(unittest.TestCase):
    def setUp(self):
        a._CACHE.clear()
        self.account="1234"
        self.token="secret-not-for-ui"
        self.calls=[]
        def fetch(url, access):
            self.calls.append((url,access))
            if url=="https://embed.gog.com/userData.json":
                return {"userId":"1234567890123"}
            if url=="https://gameplay.gog.com/clients/730/users/1234567890123/achievements":
                return {"total_count":3,"items":[
                    {"achievement_id":"a","date_unlocked":"2026-01-01T02:00:00"},
                    {"achievement_id":"b","date_unlocked":None},
                    {"achievement_id":"c","date_unlocked":None},
                ]}
            raise ValueError("unexpected URL")
        self.gog=types.SimpleNamespace(
            _PROFILE="https://embed.gog.com/userData.json",
            _active_session=lambda account:{"access":self.token},
            _http_json=fetch,
        )
        self.installer=types.SimpleNamespace(
            _account_and_game=lambda gog, account, product:
                (account,product) if account=="1234" and product=="730" else
                (_ for _ in ()).throw(ValueError("not owned")),
        )

    def test_count_unlocked_before_install_and_do_not_expose_credentials(self):
        data=a.get_summary(self.gog,self.installer,"1234","730")
        self.assertEqual(data,{"ok":True,"status":"available","unlocked":1,"total":3})
        self.assertNotIn(self.token,str(data))
        self.assertEqual(len(self.calls),2)
        second=a.get_summary(self.gog,self.installer,"1234","730")
        self.assertEqual(data,second)
        self.assertEqual(len(self.calls),2)

    def test_other_user_or_unowned_product_cannot_query(self):
        for account,product in (("9999","730"),("1234","731"),("1234","../../etc")):
            a._CACHE.clear()
            self.calls.clear()
            r=a.get_summary(self.gog,self.installer,account,product)
            self.assertEqual(r["status"],"unavailable")
            self.assertFalse(r["ok"])
            self.assertFalse(self.calls)

    def test_zero_achievements_not_confused_with_error(self):
        self.assertEqual(a._summary({"total_count":0,"items":[]}),
                         {"status":"none","unlocked":0,"total":0})
        with self.assertRaises(ValueError):
            a._summary({"total_count":5,"items":[{"date_unlocked":None}]})
        with self.assertRaises(ValueError):
            a._summary({"total_count":None,"items":[]})

    def test_404_is_unavailable_not_zero(self):
        def fetch(url, access):
            if url.endswith("/userData.json"):
                return {"userId":"1234567890123"}
            raise ValueError("GOG achievements: GOG returned HTTP 404")
        self.gog._http_json=fetch
        r=a.get_summary(self.gog,self.installer,"1234","730")
        self.assertEqual(r["status"],"unavailable")
        self.assertNotIn("total",r)

    def test_invalid_gog_user_id_rejects_untrusted_endpoint(self):
        self.gog._http_json=lambda url,access:{"userId":"../../other"}
        r=a.get_summary(self.gog,self.installer,"1234","730")
        self.assertFalse(r["ok"])
        self.assertEqual(r["status"],"unavailable")
