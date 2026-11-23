# Game Library v0.6.11-test.59 — fix GOG shortcut registration on external storage

## Observed on MSI Claw
The **Commandos: Behind Enemy Lines** Set up Play dialog found `comandos.exe`, but pressing Configure with Proton reported “Could not save GOG Steam shortcut.”

The plugin previously wrote `.game-library-gog-launch.json` inside the installed GOG game directory. SteamOS removable media and some game directories can reject chmod/chown or metadata writes. The Python backend swallowed every OS error and returned the same generic message, so the underlying error could not be diagnosed.

## Changes
- Register the Steam shortcut in the actual Steam user's private `~/.local/share/game-library/gog-launch` registry. Entries are scoped by hashed GOG account, product ID and canonical install path. **Nothing is written to or deleted from the game's installation folder.**
- Existing game-folder shortcut metadata from older versions remains readable as a legacy fallback.
- New registry directories are checked for symlinks, created with restrictive permissions and safely owned by the Steam user. The state file is written atomically and contains no credentials.
- I/O failures now include the OS error number (and a safe diagnostic in Decky logs) instead of the unhelpful generic message.
- If Steam creates a shortcut but the backend registration fails, the frontend remembers the assigned Steam AppID until a successful registration in that Game Mode session. Retry Set up Play reuses that shortcut rather than generating a second one.

## Test
1. Open completed GOG game **Commandos: Behind Enemy Lines** → Set up Play → choose `comandos.exe`.
2. Press Configure with Proton. When successful, Set up Play should become Play, and the GOG shortcut should exist in Steam.
3. If Steam already created a duplicate shortcut during test.58 failures, inspect the non-Steam library and remove only confirmed duplicates manually. This patch cannot automatically identify legacy orphaned Steam shortcuts without reliable Steam readback.
4. If a new error occurs, its OS error number should help distinguish permissions from a different backend issue; share the exact text.
5. Verify the game itself launches and has the expected Proton configuration. Success in the shortcut registration step does not by itself prove the game can run.

Tests exercise private registry storage, old-marker compatibility, symlink rejection, OS-error reporting and duplicate prevention. No changes to Steam installation, GOG download files or GOG account credentials.
