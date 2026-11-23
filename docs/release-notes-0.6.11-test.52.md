# Game Library v0.6.11-test.52 — double Game Details hero height

This update doubles the shared Steam and GOG Game Details hero backdrop height from `clamp(220px,31vh,330px)` to `clamp(440px,62vh,660px)`.

- The artwork remains an absolutely positioned background with its existing fade-to-dark gradient, so the cover, summary cards, Install/Play, separated right-aligned actions, reserved progress area, and HLTB row **do not move**.
- Existing Steam and GOG artwork selection and fallback logic remains unchanged.
- The increase is scoped exclusively to Game Library's custom Game Details layout and has no effect on native Steam Game Details, the library cards, or other UI elements.
- Source-level test checks the exact doubled height and continued bottom anchoring; the expanded hero should be visually checked on MSI Claw Game Mode.

All installer and controller handlers remain unchanged.
