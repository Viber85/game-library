Game Library v0.5.9-test.5 — Search UI visual polish

Fix the Search appearance reported on MSI Claw screenshot: remove the
large decorative box surrounding a tiny Decky input, and make the ACTUAL
TextField occupy the remaining horizontal space. Keep the same Decky
TextField (and SteamOS on-screen keyboard), input event, placeholder,
Clear button, focus and filter logic. Only Search CSS and one nested
layout wrapper change.

Filter chips no longer clip the focus outline at a scroll-container
boundary; focused Source / Availability / Clear / Sort / Back controls
use a consistent, crisp inset outline with no extra offset. Results,
existing game cards, navigation rail, Game Details B return,
Steam/Epic/GOG/Other filtering, Appearance, Midnight and native Steam
Settings are unchanged.

New targeted tests plus existing Python, Node, CSS and TypeScript checks
and the packaged ZIP must pass. Confirm the visual effect on MSI Claw.
