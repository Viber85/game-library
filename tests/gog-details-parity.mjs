import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("GOG details uses Steam layout CSS but not Steam install or launch APIs",()=>{
  const ui=read("src/SharedLibraryDetails.tsx");
  const css=read("src/theme.ts");
  const dashboard=read("src/Dashboard.tsx");
  assert.match(ui,/className="gl-game-details gl-gog-steam-details gl-unified-details"/);
  for(const token of [
    "gl-details-hero","gl-details-scroller","gl-details-intro",
    "gl-details-hltb gl-details-hltb-strip","gl-details-summary","gl-details-action-row",
    "gl-details-meta-cell","gl-details-meta-achievements"
  ])assert.ok(ui.includes(token),token+" missing from GOG details");
  assert.match(ui,/gl-details-gog-poster/);
  assert.match(ui,/aria-disabled="true"/);
  assert.match(ui,/GOG installation requires a separate gogdl downloader/);
  assert.match(css,/\.gl-root \.gl-gog-install-pending/);
  assert.match(css,/\.gl-root \.gl-details-gog-poster\{position:relative/);
  assert.match(dashboard,/detailGog \? <SharedLibraryDetails/);
  assert.doesNotMatch(ui,/SteamClient|RunGame\(|openSteamInstallWizard|steam:\/\/install/);
});

test("GOG-specific metadata lookup never treats a GOG ID as a Steam AppID",()=>{
  const ui=read("src/SharedLibraryDetails.tsx");
  const metadata=read("src/metadataRequests.ts");
  const backend=read("main.py");
  assert.match(ui,/requestGogHltbTimes\(game\.storeId,game\.title\)/);
  assert.match(ui,/requestProtonRating\(0,game\.title,true\)/);
  assert.match(metadata,/gogHltbRpc=callable<\[string,string\],HltbReply>\("gog_hltb_times"\)/);
  assert.match(backend,/async def gog_hltb_times\(self, product_id: str, name: str\):/);
  assert.match(backend,/hashlib\.sha256\(\("gog:" \+ product_id\)\.encode\("ascii"\)\)/);
  assert.match(backend,/metadata_key = \(1 << 49\)/);
  assert.doesNotMatch(ui,/parseInt\(game\.storeId|SteamClient/);
});

test("GOG Game Details retains controller Back and replaces obsolete tabs with inline metadata",()=>{
  const source=read("src/SharedLibraryDetails.tsx");
  const artwork=read("src/GogArtwork.tsx");
  assert.match(source,/onCancelButton:onBack/);
  assert.match(source,/ref:focusRef\(id\)/);
  assert.match(source,/focusNativeMenuControl\(internalBackRef\.current/);
  assert.match(source,/focusNativeMenuControl\(target,GamepadButton\.DIR_DOWN\)/);
  assert.match(source,/LAST PLAYED/);
  assert.match(source,/ACHIEVEMENTS/);
  assert.match(source,/Unavailable/);
  assert.doesNotMatch(source,/gl-details-tabs|gl-details-panel|TABS\.map|<h2>Community/);
  assert.match(source,/focusClassName="gl-focused"/);
  assert.match(artwork,/GogArtwork\(/);
});
