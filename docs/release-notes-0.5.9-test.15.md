Game Library v0.5.9-test.15 — compact Library card visual fix

This test release fixes three problems seen on the MSI Claw after v0.5.9-test.14:

1. Bottom gradient: The original .gl-poster::after rule uses inset:0.
   v0.5.9-test.14 set height:95px but inherited top:0, which placed
   the overlay in the upper half of short cards. This version explicitly
   uses inset:auto 0 0 and height:32% so the gradient is anchored to the
   bottom of the poster and ends well below the cover's midpoint.
   The title is positioned just above the metadata row.

2. Old installed checkmark: Hide the bottom-right round checkmark from
   SIZE-enabled dedicated Library cards; preserve existing behavior in
   Home carousel and Search cards.

3. SIZE alignment: Place the disk icon, SIZE (or EST.) and XX GB together
   on the left, removing margin-left:auto from the size value.

No changes to Steam Store size lookup, rates/TTL, cache, Play/Install,
controller navigation, alphabet jump/touch rail, sorting, HLTB, theme
settings, Home, Search or Collections. Grid dimensions remain unchanged.

On-device check:
- Library > Installed: verify cover art is visible above the bottom
  gradient, checkmarks are gone, and SIZE XX GB reads as one unit.
- Verify long game titles remain legible and do not overlap the SIZE
  row, including on the lower-resolution Game Mode display.
- Library > All Games: inspect estimated size labels when available.
- Confirm alphabet rail still works with D-pad and touch.
