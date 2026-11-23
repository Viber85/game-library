# Game Library v0.6.11-test.60 — Commandos GOG shortcut registration fix

## Reproduced cause from test.59 source

Steam's `AddShortcut` returned an ID and successfully created a non-Steam shortcut. During backend registration, `gog_launch.register()` then called `installer._account(account)`. The real `gog_install` module **has no `_account` function**; it exposes `_account_and_game(gog, account, product)`. This raised `AttributeError` and returned the generic `GOG shortcut registration failed (backend error)` that appeared on the MSI Claw. Our old test fixture wrongly contained a fake `_account` method, hiding the production mismatch.

## Fix

- `register()` now uses the account/ownership validation already completed by `_inspect()` through `installer._account_and_game`; the bogus `installer._account()` call is removed.
- The Python fixture now matches the real installer module (no `_account`), with an end-to-end registration → registered → Proton finalize → ready regression test using a Commandos-style `comandos.exe`.
- Unexpected backend errors now identify the exception **class** in the UI and retain a full traceback only in Decky logs, without exposing secrets or local paths.
- Private per-user registry location and account/product/path isolation from test.59 stay unchanged. No game files or Proton prefixes are modified.
- The frontend's same-session retry already reuses the Steam AppID if registration previously failed, reducing duplicates. A plugin update/restart clears this temporary cache, so any leftover orphaned Steam shortcut from earlier releases should be checked manually in Steam's non-Steam library.

## MSI Claw test

1. Install v0.6.11-test.60 and open Commandos: Behind Enemy Lines → Set up Play → `comandos.exe`.
2. Confirm Configure with Proton. It should now register the shortcut and proceed to Proton configuration; if another Steam API fails, its distinct message should identify the next step.
3. Check the Non-Steam library for an orphaned duplicate from test.58 or test.59 before manually removing any confirmed duplicates.
4. Attempt Play only after the UI reports ready. Shortcut registration alone does not prove the game launches correctly.

Build/CI provides offline regression coverage; actual Steam Game Mode behavior still needs handheld testing.
