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
  const gog=read("src/GogDashboardCard.tsx");
  const theme=read("src/theme.ts");
  assert.match(shared,/className="gl-full-grid-scroll"/);
  assert.match(shared,/className="gl-full-grid"/);
  assert.match(shared,/className="gl-poster"/);
  assert.match(shared,/className="gl-poster-name"/);
  assert.match(dashboard,/SharedLibraryGrid scrollRef=\{fullGridScrollRef\} gridRef=\{fullGridLayoutRef\}/);
  assert.match(dashboard,/SharedLibraryCardFace title=\{game.title\}/);
  assert.match(dashboard,/renderEntry\(entry,index,"grid"\)/);
  assert.match(gog,/SharedLibraryCardFace title=\{entry.title\}/);
  assert.doesNotMatch(gog,/className="gl-gog-grid"/);
  assert.doesNotMatch(theme,/.gl-gog-grid\{/);
});

test("Common details shell opens GOG from Dashboard without fake installation",()=>{
  const details=read("src/SharedLibraryDetails.tsx");
  const dashboard=read("src/Dashboard.tsx");
  assert.match(details,/UnifiedLibraryGame/);
  assert.match(details,/actions \? <div className="gl-actions"/);
  assert.match(dashboard,/detailGog \? <SharedLibraryDetails/);
  assert.match(dashboard,/onBack=\{closeGogDetails\}/);
  assert.match(dashboard,/getGridColumnCount\(fullGridLayoutRef.current\)/);
  assert.match(dashboard,/gridNeighbor\(index,gridShown.length,columns,direction\)/);
  assert.doesNotMatch(dashboard,/GogLibraryPage/);
});
