import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const read=(name)=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const dashboard=read("src/Dashboard.tsx");
const artwork=read("src/SelectedGameArtwork.tsx");
const steam=read("src/steam.ts");
const art=read("src/steamGridArtwork.ts");
const panel=read("src/SteamGridDBPanel.tsx");
const backend=read("main.py");

test("Steam native poster candidates have priority over SGDB and only failed artwork triggers lookup",()=>{
  assert.match(steam,/GetCustomVerticalCapsuleURLs/);
  assert.match(steam,/library_600x900\.jpg/);
  assert.match(dashboard,/const poster = covers\[coverIndex\] \?\? remoteCover;/);
  assert.match(dashboard,/if\(game\.nonSteam \|\| covers\[coverIndex\] \|\| lookupFinished\)return;/);
  assert.match(dashboard,/getMissingSteamArt\(game\)/);
  assert.match(dashboard,/if\(covers\[coverIndex\]\)setCoverIndex\(n=>n\+1\);/);
  assert.match(dashboard,/else setRemoteCover\(null\);/);
});

test("Hero chooses custom/native first, SGDB second, store header/poster last",()=>{
  assert.match(steam,/export function heroFallbackCandidates/);
  assert.match(steam,/GetCustomHeroImageURLs/);
  assert.match(steam,/library_hero\.jpg/);
  assert.match(artwork,/const choices = \[\.\.\.steamHeroes,\.\.\.\(remoteHero\?\[remoteHero\]:\[\]\),/);
  assert.match(artwork,/\.\.\.\(lookupFinished\?lastResort:\[\]\)/);
  assert.match(artwork,/setRemoteHero\(art\.hero\)/);
  assert.match(artwork,/if\(game\.nonSteam \|\| src \|\| lookupFinished\)return;/);
});

test("SteamGridDB lookups deduplicate cards and do not embed API keys in JS",()=>{
  assert.match(art,/callable<\[number,string,boolean\],ArtworkReply>\("steamgriddb_art"\)/);
  assert.match(art,/if\(game\.nonSteam/);
  assert.match(art,/const inFlight=new Map/);
  assert.match(art,/inFlight\.get\(key\)/);
  assert.match(art,/clearArtworkLookupCache/);
  assert.doesNotMatch(art,/Bearer |Authorization|set_steamgriddb_key/);
  assert.doesNotMatch(dashboard,/api\.steamgriddb\.com|Bearer|Authorization/);
});

test("Plugin settings keep API key write-only and user-controlled",()=>{
  assert.match(panel,/<TextField label="SteamGridDB API key" value=\{draft\} bIsPassword/);
  assert.match(panel,/get_steamgriddb_settings/);
  assert.match(panel,/set_steamgriddb_key/);
  assert.match(panel,/clear_steamgriddb_key/);
  assert.match(panel,/set_steamgriddb_enabled/);
  assert.match(panel,/steamgriddb\.com\/profile\/preferences\/api/);
  assert.match(panel,/subscribeArtworkSettingsChanged|clearArtworkLookupCache/);
  assert.match(backend,/async def get_steamgriddb_settings/);
  assert.match(backend,/async def steamgriddb_art/);
  assert.doesNotMatch(backend,/return \{"(api_key|key|token)"/);
});

test("New provider is packaged, no Steam custom artwork overwrites",()=>{
  const pack=read("scripts/package.sh");
  assert.match(pack,/steamgriddb\.py/);
  assert.doesNotMatch(dashboard,/WriteCustom|SetCustom|StoreCustomArt|SaveHero/);
  assert.doesNotMatch(art,/writeFile|localStorage|fetch\(/);
  const appearance=read("src/AppearancePage.tsx");
  const settings=read("src/PluginSettingsPage.tsx");
  const index=read("src/index.tsx");
  assert.match(settings,/<SteamGridDBPanel\/>/);
  assert.doesNotMatch(appearance,/SteamGridDBPanel|UpdatesPanel/);
  assert.doesNotMatch(index,/<SteamGridDBPanel \/>/);
});
