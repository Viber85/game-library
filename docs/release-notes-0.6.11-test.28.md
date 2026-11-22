# Game Library v0.6.11-test.28 — Fix second B after returning from Controller Settings

## Verified on MSI Claw

v0.6.11-test.27 successfully:
- Opened the correct full Steam Controller Settings screen.
- Restored our custom Game Details when pressing B in Controller Settings.
- Allowed bidirectional D-pad / left-analog focus between Game Details and the left navigation rail.

But the **next B from Game Details** failed to return to the original Library list.

## Root cause identified in actual code

The `controllerReturn` value remains non-null for the lifetime of the remounted React Dashboard (correctly, as a consumed one-shot snapshot). The following effect in test.27 was incorrectly written:

```tsx
useEffect(()=>{
  if(!controllerReturn||steamDetailsGame)return;
  const restored=games.find(g=>g.id===controllerReturn.appId);
  if(restored)setSteamDetailsGame(restored);
},[controllerReturn,games,steamDetailsGame]);
```

After pressing B, `closeSteamDetails` called `setSteamDetailsGame(null)`, which re-ran this effect. The effect immediately reopened Game Details from `controllerReturn`. Thus B appeared to do nothing.

## Targeted fix

- Track a `controllerRestorePending` one-shot ref, initially true only when Controller Settings returned but the selected game's metadata was not yet loaded.
- If the game is found during the retry, clear the pending ref *before* opening Details.
- `closeSteamDetails` **also clears the pending ref** before closing Details to the Library/Home/Collections list.
- The previous `controllerReturn` token remains consumed; no effect may reopen Details on the second B.
- The existing focus/rail handler, native Controller Settings route, visual layout, HLTB and other actions have **not changed**.

## MSI Claw validation

1. Open a Steam game from the custom Library; Game Details → Controller Settings.
2. B should return to Game Details for that exact game (already confirmed by user).
3. **B a second time** should now close Game Details and return to the **same Library tab, selected game and scroll position**, without reopening the game details.
4. Repeat from Home if needed. Confirm D-pad left/right rail transitions still work as before.

The complete CI build and regression tests pass. On-device verification of second B is still needed.
