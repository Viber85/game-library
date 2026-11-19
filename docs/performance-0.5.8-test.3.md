# Game Library v0.5.8-test.3 performance changes

Performance-only. The v0.5.8-test.2 UI, Game Mode routes, native Steam
theme, focus, Steam Input and controller mappings are intentionally unchanged.

- Cache Steam and Unifideck collection membership only within one sweep;
  the next refresh always rereads live Installed/Favorite/Epic/GOG membership.
- Share identical in-flight HLTB/ProtonDB Decky RPCs between game cards
  and sort workers. Release completed and failed requests immediately;
  persistent backend TTLs remain authoritative.
- Map HLTB disk-cache batch entries by AppID to remove repeated linear scans,
  while preserving exact title checks and stale/fresh caching semantics.
- CI contains tests for changing membership, failed collections, in-flight
  request sharing, retry after rejection, duplicate-source isolation,
  and unchanged sorting/controller interfaces.
- Appearance editor remains postponed. Verify on MSI Claw before stable.
