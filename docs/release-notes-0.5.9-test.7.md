Game Library v0.5.9-test.7 — prefix-only Search

Search previously matched a typed character anywhere in a game title.
Typing "h" therefore returned unrelated titles containing "h". Users
expect an alphabetical, beginning-of-title filter.

- Search matches only names whose beginning equals the typed text,
  after case, diacritics and extra-space normalization.
- "h" returns Hades / Hollow Knight / Hogwarts Legacy, not The Hobbit
  or Ghost of Tsushima. "dark so" matches Dark Souls.
- Exact title matches appear first, then other matches alphabetically.
- Steam, Epic, GOG and Other source filters and Installed/Not Installed
  availability filters still apply, including to one-character queries.
- No changes to the Search input field, on-screen keyboard, controller
  focus, Game Details, game art, library updates, Midnight or Appearance.

New tests verify single-letter and multiword prefix matching, exclusion
of internal-only matches and provider/install filters. Full CI, TypeScript
and packaged release ZIP required. MSI Claw verification requested.
