# Clean Midnight — design review (base 0.6.11-test.66)

Scope: first visual-only pass on custom Game Library screens and portaled Steam/GOG game options and GOG install dialog. Native Steam, QAM, Decky internals, route and focus handlers remain unchanged. Source: https://killaislop.com/#skill. This is an audit checklist, not a claim of full on-device verification.

Palette: #10151d base, #1b2430 panel, #263340 raised, #344251 border, #f4f7fa text, #aebcca secondary, #74d4f4 accent, #d8f4ff focus. Neutral cool surfaces keep game artwork dominant; cyan is reserved for active actions. Noto Sans remains the deliberate system-oriented UI face. Use tabular numerals for metadata.

## Checklist
Numbering follows the source catalogue; the application notes are specific to this project. Retain means a design constraint, not a completed exhaustive audit.

| # | Check | Application / status |
|---|---|---|
| 1 | Accent palette | Changed: solid cyan selection and primary actions, no purple gradient. |
| 2 | Heading color | Retain solid, readable title lettering; no gradient text added. |
| 3 | Color temperature | Changed to cool charcoal and muted blue-gray rather than beige. |
| 4 | Status palette | Retain meaningful ProtonDB tiers and destructive action colors; inspect remaining status screens. |
| 5 | Status notices | Review: neutral surface and explicit status text; not comprehensively changed. |
| 6 | Surface gradients | Changed selected controls and surfaces to solid colors; keep contrast scrims over game art. |
| 7 | Italic emphasis | Retain ordinary UI typography; avoid isolated decorative serif emphasis. |
| 8 | UI font category | Retain legible sans-serif typography. |
| 9 | Text decorations | No ornamental highlights or strike-through added; inspect remaining views. |
| 10 | Heading overlines | Changed: hide redundant Appearance overline; retain useful context in modal. |
| 11 | Oversized headlines | Retain concise game and screen titles, not marketing copy. |
| 12 | Type hierarchy | Retain title/action/metadata ordering and established sizes; device review pending. |
| 13 | Copy emphasis | No decorative keyword highlighting added. |
| 14 | UI writing | Changed shared game menu labels; keep concise functional labels. |
| 15 | Emoji | Retain existing icon library, not emoji decoration. |
| 16 | Status lights | Removed selected glows; inspect any remaining indicator-specific glow. |
| 17 | Accent-edge cards | Neutral borders in changed panels; inspect other panels for ornamental side stripes. |
| 18 | Icon backgrounds | Neutral control surfaces; inspect any standalone icon tiles. |
| 19 | Blur and radius | Changed selected glass surfaces to solid panels, 6px controls and 8px covers. |
| 20 | Shadows | Changed selected focus glow and shadows to plain solid outlines. |
| 21 | Nested radii | Changed main cover/control radii; verify nested panel geometry on device. |
| 22 | Border continuity | Changed selected borders to uniform solid lines; verify rendered corner joins. |
| 23 | Pills and badges | Changed filters to compact rectangular controls; retain meaningful compatibility badges. |
| 24 | Icon sources | Keep existing library icons, not new generated SVGs. |
| 25 | Tinted icon tiles | Changed menu glyphs to neutral colors; inspect remaining standalone tiles. |
| 26 | Motion on focus | Removed selected game translation and button movement; reduced-motion support. |
| 27 | Loading animation | Review existing spinner rendering; no replacement without evidence of a defect. |
| 28 | Uppercase labels | Changed shared context menu to natural case; inspect other screen labels. |
| 29 | Data integrity | Retain existing metadata sources and actual data; no fabricated stats. |
| 30 | Section numbering | No decorative section numbers introduced. |
| 31 | Nested panels | First pass simplifies surfaces; structural flattening requires a separate layout review. |
| 32 | Spacing system | Preserve validated geometry and existing different gaps; check density on device. |
| 33 | Font choice | Noto Sans with Segoe UI fallback; deliberate legibility and platform fit. |
| 34 | Terminal styling | Retain proportional UI font and conventional game controls. |
| 35 | Editorial styling | Retain console-first hierarchy; tabular numbers for operational metadata. |

## Verification
- Inspect home, library filters, game grid, Steam/GOG details, download states, contextual menu and collection sub-menu.
- Verify D-pad, analog, A/B and Start. No changes to event handlers in this branch.
- Check Steam native menus and other Decky plugins remain unchanged.
- Verify focus on selected filters and artwork, including first/last items in scroll containers.
- Do not merge/release until visual and controller checks pass.
