import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  libraryGameKey,fromSteamLibraryGame,fromGogLibraryGame,
  steamCatalogAdapter,gogCatalogAdapter,
} from "../src/unifiedLibraryGame.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Every provider has a unique stable game key; no fake Steam IDs",()=>{
  assert.equal(libraryGameKey("steam","123"),"steam:123");
  assert.equal(libraryGameKey("gog","123"),"gog:123");
  assert.equal(libraryGameKey("epic","123"),"epic:123");
  assert.notEqual(libraryGameKey("steam","123"),libraryGameKey("gog","123"));
  for(const invalid of ["","../bad","123:456","space id","a".repeat(130)])
    assert.throws(()=>libraryGameKey("gog",invalid));
});

test("GOG owned metadata never pretends to be installed, launchable or a Steam shortcut",()=>{
  const game=fromGogLibraryGame({
    id:"98765",title:"Example Game",image:"https://images.gog-statics.com/example.webp",
    imageFallback:"",background:"https://images.gog-statics.com/example.jpg",
  });
  assert.equal(game.key,"gog:98765");
  assert.equal(game.store,"gog");
  assert.equal(game.availability,"unknown");
  assert.equal(game.steamAppId,undefined);
  assert.deepEqual(game.capabilities,["details"]);
  assert.equal(game.cover,"https://images.gog-statics.com/example.webp");
  assert.equal(gogCatalogAdapter.toLibraryGame({
    id:"98765",title:"Example Game",image:"",background:"",
  }).key,game.key);
});

test("Steam adapter preserves the existing native Steam appID and availability",()=>{
  const game=fromSteamLibraryGame({
    id:4294967294,title:"Native Steam Shortcut",nonSteam:true,installed:true,
    favorite:false,lastPlayed:0,playtimeMinutes:0,
  });
  assert.equal(game.key,"steam:4294967294");
  assert.equal(game.steamAppId,4294967294);
  assert.equal(game.availability,"installed");
  assert.deepEqual(game.capabilities,["details","install","launch"]);
  assert.equal(steamCatalogAdapter.store,"steam");
});

test("Steam and GOG use one shared responsive full library grid and poster frame",()=>{
  const shared=read("src/SharedLibraryGrid.tsx");
  const dashboard=read("src/Dashboard.tsx");
  const gog=read("src/GogLibraryPage.tsx");
  const theme=read("src/theme.ts");
  assert.match(shared,/className="gl-full-grid-scroll"/);
  assert.match(shared,/className="gl-full-grid"/);
  assert.match(shared,/className="gl-poster"/);
  assert.match(shared,/className="gl-poster-name"/);
  assert.match(dashboard,/SharedLibraryGrid scrollRef=\{fullGridScrollRef\} gridRef=\{fullGridLayoutRef\}/);
  assert.match(dashboard,/SharedLibraryCardFace title=\{game.title\}/);
  assert.match(gog,/SharedLibraryGrid gridRef=\{gridRef\}/);
  assert.match(gog,/SharedLibraryCardFace title=\{game.title\}/);
  assert.doesNotMatch(gog,/className="gl-gog-grid"/);
  assert.doesNotMatch(theme,/.gl-gog-grid\{/);
});

test("Common details shell supports store capabilities, but GOG has no fake install",()=>{
  const details=read("src/SharedLibraryDetails.tsx");
  const gog=read("src/GogLibraryPage.tsx");
  assert.match(details,/UnifiedLibraryGame/);
  assert.match(details,/actions \? <div className="gl-actions"/);
  assert.match(gog,/SharedLibraryDetails game=\{fromGogLibraryGame\(detailGame\)\}/);
  assert.match(gog,/onCancelButton=\{onFocusRail\}/);
  assert.match(gog,/getGridColumnCount\(gridRef.current,5\)/);
  assert.match(gog,/gridNeighbor\(index,visible.length,columns,direction\)/);
  assert.doesNotMatch(gog,/SteamClient\.Apps\.RunGame/);
});
