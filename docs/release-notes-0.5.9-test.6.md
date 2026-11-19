Game Library v0.5.9-test.6 — Search field visibility hotfix

Address regression reported on MSI Claw: after v0.5.9-test.5 removed
the oversized Search box, the actual native TextField became invisible
and typing was no longer readable. Root cause: overly broad CSS class
and label selectors applied to Steam's dynamically loaded TextField DOM.

Fixes:
- Remove the unsafe label clipping, dynamic class substring selectors
  and broad :has(input) width/flex overrides.
- Use the native Decky TextField without its optional visible label,
  retaining an explicit accessible aria-label, native SteamOS keyboard,
  controlled query text and automatic focus.
- Make one compact, full-width 48px field visible with a readable
  text color and placeholder; draw only one outer focus ring.
- Preserve the previous clean focus states on Source/Availability,
  Clear, Sort and Back.

Search results, filters, live query, controller, left navigation,
Appearance, Midnight/native Steam CSS, game metadata and all
other functionality are unchanged. Full CI, TypeScript and ZIP
packaging required. On-device visual verification still required.
