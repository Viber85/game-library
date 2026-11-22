# Game Library v0.6.11-test.9 — Shared multi-store library foundation

This is the **first structural milestone** toward treating GOG, Epic, Ubisoft Connect and later stores as first-class sources in the same Game Library. It deliberately does not implement downloads or pretend owned games are installed.

## Changes in this build

1. Introduced \`UnifiedLibraryGame\` with **namespaced provider identity** (\`steam:123\`, \`gog:123\`, later \`epic:...\`, etc.), title, availability, artwork, metadata and **explicit capabilities**. A store's native ID is never forged into a Steam AppID.
2. Implemented Steam and GOG adapters to this shared model. Future stores can add adapters without altering Steam's installed-game data.
3. Extracted the **exact shared full-grid layout and card face** from the existing Steam Dashboard. Steam's Library and Search and the GOG tab now render through that same component, using the same poster frame, focus highlight, tile dimensions, gaps and responsive CSS.
4. Removed GOG-specific grid sizing rules that made its tile layout look different on the handheld.
5. Added a **store-neutral details shell** and migrated GOG details to it. For now, Steam still opens Steam's **native detail page**, preserving its established install/play/options behavior. We will bring the shared details page to Steam only when native action parity is established.
6. Kept Steam's card actions, installation badges, controller navigation, sorting and routing unchanged. GOG's A/touch-to-open and B-to-return navigation still work.

## What is NOT yet unified

- Steam's **native game details route** and GOG's store-neutral details shell remain different. This is temporary, not an assertion of finished parity.
- GOG is still discovered through its existing separate provider tab. The next step will feed a common, provider-agnostic inventory into All Games, store tabs, Search, filters and collections, with deduplication for imported shortcuts.
- GOG install state cannot be inferred merely from ownership. The adapter correctly marks it **unknown** until a local installation scanner is built.
- No Epic, Ubisoft or other store is connected yet, and no installer/launcher exists for those stores. A visible Install/Play button must not be shown without a verified working backend.

## Target architecture

\`Store Connector → UnifiedLibraryGame → Shared Grid / Shared Details → Capability-specific actions\`

Each store connector will be independent and responsible for:
- Authentication and token refresh (account scope, no tokens in the frontend)
- Owned-game library and artwork
- Local game installation discovery and disk usage
- Reliable install/download/update/uninstall progress
- Launching installed titles through the correct SteamOS compatibility runtime (often Proton), with status/exit handling
- Game metadata/progress and deduplication when a title exists in multiple stores

**Planned order:** finish GOG shared inventory and details; GOG installation scanner; GOG installation (via its own installer backend and manifest), updates and Proton launching; then Epic account/catalog and installer, followed by Ubisoft Connect with a more complex Windows launcher/DRM integration. Additional stores will reuse the same UI contract.

Unifideck source code, credentials, runtime files and APIs are never used.

## Validation
CI checks provider ID isolation, correct availability, no GOG fake launch actions, use of shared card/grid by both Steam and GOG, details shell, and existing Steam regression tests. Real SteamOS UI needs device confirmation after installing the ZIP.
