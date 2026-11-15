# Game Library — SteamOS Decky plugin

Independent SteamOS Game Mode dashboard / library project, developed from the **Viber85 Claw Metrics** Decky TypeScript/Rollup conventions. This is **not** a fork or copy of PS5 Dashboard.

## Initial design goals
- Persistent vertical Steam navigation icons on the left.
- Reveal the icon's text label on controller focus without hiding the icons.
- On the first game card, D-pad Left moves focus to the navigation rail; D-pad Right/B returns to the game row.
- Horizontal row of installed and library games.
- Selected game's art and details below the game row.
- Controller-first UX, safe fallback when Steam app metadata is unavailable.
- Preserve Steam's original menus and library as fallback.

## Status
Early development scaffold. Frontend only: **not yet verified on a physical SteamOS device**.
The plugin starts as an opt-in separate dashboard route launched from Decky Quick Access, so it does not replace Steam's home automatically.

## Local build
```bash
npm install
npm run typecheck
npm run build
```

See `docs/implementation.md` for layout, current limitations, and testing checklist.
