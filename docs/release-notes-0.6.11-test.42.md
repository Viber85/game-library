# Game Library v0.6.11-test.42 — hotfix SteamUI crash on Cancel download

## MSI Claw crash in test.41
Pressing Cancel download caused Steam's Game Mode error screen:
`TypeError: Cannot read properties of undefined (reading 'client_name')`.

The new direct call to a private, webpack-discovered Steam Uninstall React modal mounted the dialog outside its expected Steam UI context. Its render error could crash Steam's whole gamepad interface. Automatic unit tests could not catch this SteamOS runtime crash.

## Hotfix — do not invoke Steam's private Uninstall component
- Removed `nativeSteamUninstallDialog.ts` entirely; no runtime imports or calls remain.
- For a **verified new install**, Cancel download now opens the *already working* native Steam Library context menu through the project's existing `showNativeGameOptions` integration, anchored to the button.
- From that native menu, select **Manage → Uninstall** to open the **actual Steam Uninstall confirmation** seen in the user's screenshots. This requires one additional selection; opening that modal directly from Decky is not reliable on this SteamOS build.
- The dialog and uninstall itself remain wholly owned by Steam. No manual calls to its private React modal, simulated controller clicks, or automatic filesystem deletion on opening the menu.
- The main button shows **Steam options open** while waiting rather than incorrectly claiming that Steam has accepted an uninstall request. If Steam cannot open the menu, an inline error is shown.
- Existing protection for installed-game updates remains: their Cancel button never uninstalls the existing game or clears Proton data.
- Steam Downloads ETA, progress, Pause/Resume, transfer size, UI layout, HLTB, Store navigation and library styling are unchanged.

## Device test
1. After recovering from the Steam Game Mode crash, install v0.6.11-test.42 and restart Decky/Steam UI if necessary.
2. Start or pause a small **new game** download; press **Cancel download**.
3. The Steam-native context menu should appear (like the user's second screenshot). Select **Manage → Uninstall**.
4. Confirm Steam's own Uninstall dialog (the third screenshot); verify the download and partial install are actually removed.
5. Press Cancel in the native Uninstall dialog once to ensure no game files are removed without consent.
6. Verify Time left still shows Steam's estimate when a download is active.

## Verification
New regression assertions fail if the crash-prone native modal helper is recreated or imported. The CI build, tests, TypeScript check and packaging do not simulate the user's exact SteamOS runtime; direct opening of the modal must remain disabled until a *safe*, device-verified public or native-navigation route is known.
