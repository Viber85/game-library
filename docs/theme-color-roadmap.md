# Midnight theme — incremental color controls (post-0.5.8)

This is the implementation roadmap for the **next phase**. The cleanup
release **does not enable or alter any theme colors**.

## Confirmed baseline

The current theme is navy / cyan, already applied to Steam's main Game Mode
screen, Steam Menu, Quick Access Menu (including Decky), Settings, Power,
Volume and Game Details, with our React Game Library using the same visual
language. The user explicitly approved a **single 2px cyan outline and soft
blue ~20px glow on the focused item** (not around the entire navigation list).

Previously tested SteamOS safety constraints are part of the design contract:
- Do not recolor the transparent whole CEF/GamepadUI root: it causes dark
  flashes over games/notifications.
- Do not alter controller/focus order, layout, input mappings, widths or
  Steam's native overlay geometry.
- Keep the **Steam Input controller-layout summary** looking like original
  SteamOS, even when Midnight is enabled.
- Apply new colors to both Steam's **main** and **overlay** contexts, including
  actual Decky Settings/QAM targets; avoid relying on invented class names.
- Preserve the exact B/Back origin, native Start context menu, Y sorting,
  SteamGridDB/HLTB integrations, and supported TabMaster collections.

## Real code locations

| Surface | Current source | Existing variable strategy |
| --- | --- | --- |
| Game Library Home, covers, grid, tabs and sidebar | `src/theme.ts` | `--gl-bg`, `--gl-surface`, `--gl-blue`, `--gl-text`, `--gl-muted`, but many rules still hard-code colors |
| Native Steam Main + Decky QAM | `system-theme/shared.css`, `qam.css`, `menus.css`, `buttons.css` | Shared `--glm-*` tokens, plus scoped fixed color declarations |
| Settings and Decky Settings | `settings.css`, `settings-extras.css`, `settings-focus.css`, `settings-gamepad-focus.css`, `decky-settings.css` | Some `--glm-*` tokens; highly specific tested native focus rules |
| Native Game Details | `game-details.css`, `game-details-extras.css`, `game-details-midnight.css` | Real Steam/Decky CSS class alias compiler |
| Persistent theme selection | `main.py` `get_theme_settings` / `set_theme_settings` | Currently only `midnight` / `off` |
| Live Steam CSS injection | `src/themeController.ts`, `src/builtinThemeRuntime.ts`, `src/themeCssCompiler.ts` | Bundled main/overlay CSS, live alias expansion + atomic replacement |

The stable shared defaults include `--glm-bg-deep: #030c1a`,
`--glm-panel: #0c1b32` and `--glm-accent: #4ac1ff`.
The separately verified focus rule uses `#63cfff` and
`rgba(3,157,255,.72)`. These are not all interchangeable; distinguish
accent, focused border, focused fill and glow when migrating rules.

## Planned releases: add small groups, verify on handheld each time

### Stage 1 — Accent Color (first user-facing control)

- Begin with **Midnight / Default** plus a validated six-digit HEX color
  picker (or a small set of documented presets and a Custom option).
- Initially customize the sidebar, grid card focus and action/button accents
  in our **own** Game Library UI. Retain the approved navy base, 2px outline
  geometry and glow radius.
- Scope new CSS variables to `.gl-root`. Do not paint native Steam/QAM yet.
- Provide Preview, Apply, Cancel and Reset to Midnight default; only Apply
  persists, and Cancel restores the previously active color.

### Stage 2 — Native Steam / Decky accent

- Feed the same sanitized semantic color tokens to the **main and overlay**
  bundled CSS, while retaining Steam's actual CSS alias compiler and existing
  current-client scope rules. Use a validated backend preference, not arbitrary
  user-provided CSS paths or selectors.
- Replace hard-coded accent values **one proven selector group at a time**
  (Steam Menu, QAM/Decky, Settings, Game Details), testing the physical Claw
  focus state between groups.
- Preserve transparent notification layers, native Steam Input visuals, and
  no-color-flash atomic stylesheet swap. Do not overwrite every bright blue
  value blindly: some are semantic text, selection or accessible contrasts.

### Stage 3 — Base surfaces

- Expose **Background**, **Surface**, and **Raised Surface** individually.
  Keep menu contrast and dark transparent overlays consistent.
- Only after verifying readability, add secondary items such as border
  opacity and selected-background color. Never modify layout/geometry.

### Stage 4 — Typography, details and theme presets

- Add **Primary Text**, **Muted Text**, and **Focus/Glow** with contrast
  validation and defaults. No controls for fonts or type scale in the initial
  color releases.
- Let user save named palettes, reset everything to Midnight defaults, or
  disable Midnight to restore stock SteamOS.

## Engineering constraints before enabling any customization

1. Centralize color tokens and migrate each literal only when its *actual*
   native CSS target and precedence are verified. `shared.css` already
   contains a partial palette; `theme.ts` uses a separate palette.
2. Validate input strictly (HEX colors and bounded numeric opacity); never
   append raw text to native Steam CSS and never allow arbitrary CSS paths.
3. Store per-account overrides in plugin preferences with defaults and
   schema versioning. Old settings must load safely with no data loss.
4. The live theme runtime currently skips reinjection when an unchanged
   `ThemeId` is already active. For previews, change detection must also
   include the **palette revision/hash**, and stylesheet replacement must
   remain atomic to prevent the previously fixed Steam Settings color flash.
5. Reuse existing audit/diagnostics to compare rendered colors and check
   that only the actually focused menu item has the outline/glow.
6. Add regression tests to confirm the stock Midnight palette is
   pixel-equivalent when all color overrides are left at defaults.

**Current phase**: code cleanup and preparation only. The first actual
color-picker controls belong in a separate opt-in test release after a
successful on-device regression test of this cleanup.
