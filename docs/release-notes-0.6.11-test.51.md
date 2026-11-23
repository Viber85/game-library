# Game Library v0.6.11-test.51 — bottom-aligned Game Details and split action row

## MSI Claw layout adjustments

- Group the cover, title, installation metadata, buttons, native download controls, and HLTB strip inside one bottom-aligned content block on **Steam and GOG**. The top bar and hero artwork stay independent and remain at the top.
- Use available vertical space to move the whole group toward the bottom of the Game Mode viewport, close to the footer rather than leaving an empty half-screen below HLTB.
- Enlarge the Steam **Install/Play** button; enlarge HLTB details, Steam Store/Details, Controller, and Settings actions.
- Keep **Install/Play on the left** while the HLTB/Steam Store/two icon controls form one right-aligned group on the far right of the right-hand panel. The right group can wrap gracefully at narrow widths without overlapping the primary button.
- Increase the three summary cards' height and value typography slightly while preserving the 2:3 cover.
- Preserve the fixed-height native download status region underneath the action row, so the HLTB strip stays put as Steam progress, Pause/Resume, Cancel, or confirmation feedback appears.

## Safety and behavior

- All Steam native Install/Play, progress, Pause/Resume, Cancel, uninstall confirmation, controller, options, Store and HLTB callbacks remain unchanged. No change to download data sourcing or cancellation authorization.
- GOG retains the same bottom-anchored layout and disabled installer placeholder; no simulated GOG download or achievements.
- Additional source-level tests check nesting, action grouping, no lost handlers and responsive style rules.

## MSI Claw checks

1. Confirm a 1280×800 Game Details page places the bottom HLTB row just above the footer, with hero and top bar stationary.
2. Check Install on the left; HLTB / Store / controller / settings separated and right aligned.
3. Start a Steam download, then test Pause/Resume and Cancel: progress should be inside the existing fixed-height slot without shifting HLTB.
4. Navigate all focusable controls with D-pad and left stick, including moving from the sidebar and returning with B.
5. Open several GOG titles and confirm cover and fallback artwork, bottom alignment and proper missing metadata labels.
6. On narrow displays or long titles, content can scroll; actionable controls must not overlap.

This release is tested in CI; layout in actual Steam Game Mode must still be verified on the device.
