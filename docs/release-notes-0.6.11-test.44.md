# Game Library v0.6.11-test.44 — GOG Game Details, phase 1

## Overview
The GOG screen previously displayed a centered cover, title and a static
"installation will become available" note. It now uses the **same responsive
Game Details layout as Steam**.

## Changes
- Same cover/hero structure, source label, ownership row and HLTB tiles
  (main story, extras, completionist and locally reported playtime).
- Uses actual GOG artwork first; SteamGridDB fallback is unchanged.
- Queries HowLongToBeat for the selected GOG product using a dedicated
  `gog_hltb_times(product_id, title)` backend RPC and an isolated
  metadata-only cache ID, so no GOG product ID becomes a Steam AppID.
- Queries ProtonDB through the existing title-match resolver, which uses a
  verified Steam title match rather than the GOG product ID.
- Same Activity / Your Stuff / Community / Game Info tab structure, SteamOS
  status bar and controller Back behavior as the Steam details design.
- Displays a visually inactive **Install** action and a truthful explanation:
  the GOG downloader is **not connected yet**. No fake download %, no
  fake installed status, and no Game Mode launch into the Steam Store.
- Installation implementation plan saved as
  `docs/gog-installation-architecture.md`.

## How real GOG installation will work
UniFideck's code demonstrates the viable architecture:
`gogdl` for authenticated GOG game packages; choose Windows/Linux build,
language and internal/SD storage; launch a supervised backend subprocess with
real progress; verify files; create a per-game launcher and Steam shortcut
using Proton/UMU for Windows executables. Cancellation and cleanup belong
to this GOG process, **not SteamClient.Downloads**. We will build these
pieces inside Game Library without depending on UniFideck's installation,
state or credentials.

## MSI Claw verification
1. Open GOG > a game. Check that the visual layout now resembles Steam Game
   Details and that GOG cover, hero, HLTB and title-based ProtonDB load.
2. Navigate the four sections with gamepad and return to Library using B.
3. Confirm Install is visibly disabled, not a fake functional install.
4. Check Steam downloads, install/cancel, controller settings, HLTB, and
   the Steam Store Back fix remain unchanged.

**Scope:** test.44 is the **Game Details UI milestone**. It does **not**
include an operational GOG game downloader, Play or a progress bar.
