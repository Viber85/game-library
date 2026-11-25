# Game Library v0.6.11-test.66 — narrower, centered menu buttons

MSI Claw visual feedback: in test.65 the custom Steam/GOG context menu buttons were still too wide and appeared biased toward the right edge.

Changes:
- Make every main-menu and Add to Collections submenu action exactly 84% of its parent panel width (max-width 84%), centered by align-self:center and margin-inline:auto.
- Preserve the existing dialog width, typography, 44 px button height, 4 px vertical gaps, focus outlines, and controller navigation.
- Inset the left icon at 16 px and the right chevron/checkmark at 18 px within each smaller button.
- Both main actions and collection entries use the same CSS selector, so visual parity is automatic. No functional or data changes.

Device checks: inspect horizontal spacing on the MSI Claw, browse Add to Collections with a long list, and verify D-pad/analog focus and B-back behavior.
