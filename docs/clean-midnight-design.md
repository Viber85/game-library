# Clean Midnight — design review (base 0.6.11-test.66)

Scope: first visual-only pass on custom Game Library screens and portaled Steam/GOG game options and GOG install dialog. Native Steam, QAM, Decky internals, route and focus handlers remain unchanged. Source: https://killaislop.com/#skill. This is an audit checklist, not a claim of full on-device verification.

Palette: #10151d base, #1b2430 panel, #263340 raised, #344251 border, #f4f7fa text, #aebcca secondary, #74d4f4 accent, #d8f4ff focus. Neutral cool surfaces keep game artwork dominant; cyan is reserved for active actions. Noto Sans remains the deliberate system-oriented UI face. Use tabular numerals for metadata.

## Checklist
Status: Changed = addressed in this pass; retain = a deliberate existing behavior or a requirement; review = needs further inspection of rendered screens.

| # | Design check | Application / status |
|---|---|---|
| 1 | Single accent | Changed: solid cyan selection and primary actions; no purple branding. |
| 2 | Solid title text | Retain: readable titles, no gradient lettering. |
| 3 | Intentional temperature | Changed: cool charcoal rather than beige or oversaturated blue. |
| 4 | Meaningful status color | Retain: destructive action and ProtonDB tier keep semantic distinctions. |
| 5 | Useful notices | Review: distinguish warning/error by text and icon, not just color. |
| 6 | Purposeful gradients | Changed: remove selected decorative gradients; retain artwork scrims for contrast. |
| 7 | Real iconography | Retain existing icon library; no emoji illustrations. |
| 8 | No ornamental icon tiles | Changed: neutral menu glyphs and flat control surfaces. |
| 9 | Consistent icon scale | Retain existing sizes and positions; verify on device. |
| 10 | Icons supplement labels | Retain menu labels and native control prompts. |
| 11 | No gratuitous decoration | Changed: remove selected glow and blur effects. |
| 12 | Consistent hierarchy | Retain game title, action, then metadata ordering. |
| 13 | Restrained radius | Changed: 6px controls, 8px artwork; round functional progress indicators remain. |
| 14 | Avoid generic pill shapes | Changed: filters are rounded rectangles; keep meaningful badges. |
| 15 | No distracting shadows | Changed: flat surfaces and solid focus outlines. |
| 16 | Avoid glass panels | Changed: disable backdrop blur on selected top bars and panels. |
| 17 | Thin deliberate borders | Changed: restrained neutral separators and borders. |
| 18 | Avoid nested boxes | Review: first pass simplifies surfaces without restructuring navigation or metadata. |
| 19 | Clear spacing | Retain verified layout geometry; device review needed before density changes. |
| 20 | No gratuitous card grids | Retain game cover grid because browsing artwork is the core task. |
| 21 | Visible priority | Changed: cyan primary action, neutral secondary actions. |
| 22 | Stable alignment | Retain layout widths, action positions and menu centering. |
| 23 | Clear focal point | Retain hero and selected game. |
| 24 | Natural copy | Changed: game options labels in natural case. |
| 25 | No promotional filler | Retain functional UI labels; review other screens. |
| 26 | Avoid decorative emphasis | Changed: redundant appearance overline hidden; no extra uppercase styling in menu. |
| 27 | Meaningful badges | Retain ProtonDB, installed status and download progress. |
| 28 | Honest data | Retain existing metadata sources; no invented data introduced. |
| 29 | Purposeful animation | Changed: selected game no longer translates on focus; reduced-motion override. |
| 30 | Clear interaction state | Changed: solid high-contrast focus; preserve selected vs focused states. |
| 31 | Accessible contrast | Review: visually verify text over artwork, focus clipping and dimmed states. |
| 32 | Fit real screen sizes | Retain breakpoints and dimensions; check MSI Claw at native resolution. |
| 33 | Deliberate font stack | Changed: Noto Sans, Segoe UI fallback, sans-serif; no Inter default. |
| 34 | No ornamental terminal look | Retain proportional UI text and ordinary controls. |
| 35 | No editorial-dashboard imitation | Retain console-first hierarchy; use tabular numerals. |

The numbering above is our working design checklist; it groups some source concepts differently. See the source for the original taxonomy.

## Verification
- Inspect home, library filters, game grid, Steam/GOG details, download states, contextual menu and collection sub-menu.
- Verify D-pad, analog, A/B and Start. No changes to event handlers in this branch.
- Check Steam native menus and other Decky plugins remain unchanged.
- Verify focus on selected filters and artwork, including first/last items in scroll containers.
- Do not merge/release until visual and controller checks pass.
