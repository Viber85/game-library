# Game Library v0.6.11-test.65 — compact centered options

## Visual refinement from MSI Claw feedback

- Keep the same five-option custom context menu for Steam and GOG; do not change navigation, providers, installation, collection editing, artwork, native Controller Settings or Game Properties logic.
- Center the modal panel horizontally and center the game name, context labels and individual menu option labels.
- Reduce each option to a **fixed 44 px total height**, inclusive of padding and border (previously a 44 px minimum plus 22 px padding). Keep the focus outline visible and controller-accessible.
- Place each option's icon at a consistent left inset and collection chevrons/checkmarks at a fixed right inset, while keeping the label truly centered.
- Tighten vertical gaps from 6 px to 4 px and lightly reduce heading/footer padding. All collection submenu choices share the **same CSS class** as top-level options, so they receive identical compact row geometry.
- Center collection subsection captions and footer controls; keep collection list scrollable on handheld height, without clipping large library collections.
- Keep B Back and Start behavior unchanged. No changes to data or save paths.

## On-device check

1. Open a Steam title and a GOG title; inspect the centered five-option menu and smaller rows.
2. Open **Add to Collections** and verify compact choices, subgroup labels, and B return to the main menu.
3. Scroll a long collection list with D-pad and analog; confirm the selected row outline remains visible.
4. Verify Start/gear still open the same menu and all existing actions behave as in test.64.
