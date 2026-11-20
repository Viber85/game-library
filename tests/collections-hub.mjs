import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {continuePlayingGames,personalCollectionTabs} from "../src/collectionViews.ts";
import {readCollectionLocation,saveCollectionLocation,resetCollectionLocation} from "../src/collectionsNavigation.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const dashboard=read("src/Dashboard.tsx");
const page=read("src/CollectionsPage.tsx");
const index=read("src/index.tsx");
const css=read("src/theme.ts");
const now=2000000000;
const game=(id,title,lastPlayed)=>({id,title,lastPlayed,installed:true,nonSteam:false,
  favorite:false,playtimeMinutes:0});

test("Four hub cards are present, in the agreed order",()=>{
  const names=[...page.matchAll(/\{id:"(continue|backlog|completed|my)",title:"([^"]+)"/g)]
    .map(([_,id,title])=>[id,title]);
  assert.deepEqual(names,[
    ["continue","Continue Playing"],["backlog","Backlog"],
    ["completed","Completed"],["my","My Collections"],
  ]);
  assert.match(page,/className="gl-collections-cards"/);
  assert.match(css,/\.gl-root \.gl-collections-cards \{\s*display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(page,/onActivate=\{\(\)=>openSection\(card\.id\)\}/);
});

test("Continue Playing only includes games actually played within the last 30 days",()=>{
  const list=[
    game(1,"Fresh",now-1),
    game(2,"Boundary",now-30*86400),
    game(3,"Old",now-30*86400-1),
    game(4,"Never",0),
    game(5,"Future",now+1),
    game(6,"Another",now-2),
  ];
  assert.deepEqual(continuePlayingGames(list,now).map(x=>x.id),[1,6,2]);
  assert.deepEqual(continuePlayingGames([],now),[]);
});

test("My Collections lists only genuinely custom Steam/TabMaster tabs",()=>{
  const tab=(id,title,position)=>({id,title,position,filters:null,filtersMode:"and"});
  const entries=[
    tab("AllGames","All Games",0),tab("Installed","Installed",1),
    tab("Favorites","Favorites",2),tab("NonSteam","Non-Steam",3),
    tab("epic-game","Epic",4),tab("gog-games","GOG",5),
    tab("RPG","RPG Games",8),tab("survival","Survival",7),
  ];
  assert.deepEqual(personalCollectionTabs(entries).map(x=>x.title),
    ["Survival","RPG Games"]);
});

test("Backlog and Completed provide saved manual membership and do not infer completion",()=>{
  assert.match(page,/manualGames\(games,manual,manualSection\)/);
  assert.match(page,/manualLoaded\?manual\.backlog\.length:null/);
  assert.match(page,/manualLoaded\?manual\.completed\.length:null/);
  assert.match(page,/void editManual\(picker,game,!added\)/);
  assert.match(page,/void editManual\(manualSection,game,false\)/);
  assert.match(page,/TextField aria-label="Find games for collection"/);
  assert.match(page,/setPicker\(section\)/);
  assert.match(page,/onOptionsActionDescription=\{manualSection\?/);
  assert.doesNotMatch(page,/achievementsUnlocked===achievementsTotal|playtimeMinutes===0/);
  assert.doesNotMatch(page,/MANUAL · NEXT PHASE/);
  const source=read("src/manualCollections.ts");
  assert.match(source,/get_manual_collections/);
  assert.match(source,/set_manual_collection/);
  assert.match(source,/new Set\(state\[section\]\)/);
  const backend=read("main.py");
  assert.match(backend,/async def get_manual_collections\(self\)/);
  assert.match(backend,/async def set_manual_collection\(self, section:/);
  assert.match(backend,/saved\["manual_collections"\] = state/);
  assert.match(backend,/state\[other\] = \[item for item in state\[other\] if item != appid\]/);
});

test("Collections route, exact nav placement, and native header cleanup",()=>{
  assert.match(dashboard,/\{ id: "collections", label: "Collections", icon: MdCollectionsBookmark, go: openCollections \}/);
  const order=[...dashboard.matchAll(/\{ id: "(home|library|search|collections|appearance|steam-menu)"/g)]
    .map(x=>x[1]);
  assert.deepEqual(order,["home","library","search","collections","appearance","steam-menu"]);
  assert.match(index,/routerHook\.addRoute\(COLLECTIONS_ROUTE/);
  assert.match(index,/routerHook\.removeRoute\(COLLECTIONS_ROUTE\)/);
  assert.match(dashboard,/collectionsMode\?COLLECTIONS_ROUTE:"\/library\/home"/);
  assert.match(dashboard,/<CollectionsPage key=\{collectionsPageRevision\}/);
  assert.match(page,/<SystemStatusBar statusRef=\{headerRef\}/);
  assert.match(css,/html:has\(\.gl-root\.gl-own-status-only\) #header/);
});

test("Hub controller navigation supports D-pad left/right/up/down and B",()=>{
  assert.match(page,/b===GamepadButton\.DIR_RIGHT&&index%2===0/);
  assert.match(page,/b===GamepadButton\.DIR_LEFT&&index%2===1/);
  assert.match(page,/b===GamepadButton\.DIR_DOWN&&index<2/);
  assert.match(page,/b===GamepadButton\.DIR_UP&&index>=2/);
  assert.match(page,/onCancelButton=\{onHome\}/);
  assert.match(page,/onCancelButton=\{back\}/);
  assert.match(dashboard,/collectionsEntryRef\.current\?\.focus\(\)/);
  assert.match(dashboard,/if\(initialMode==="appearance"\)\{/);
});

test("Game Details native B return retains collection location in memory",()=>{
  resetCollectionLocation();
  assert.deepEqual(readCollectionLocation(),{section:"home",tabId:null,gameId:null});
  saveCollectionLocation({section:"continue",tabId:null,gameId:48});
  assert.equal(readCollectionLocation().gameId,48);
  saveCollectionLocation({section:"my",tabId:"RPG",gameId:48});
  assert.equal(readCollectionLocation().tabId,"RPG");
  resetCollectionLocation();
  assert.equal(readCollectionLocation().section,"home");
  const details=read("src/detailsReturn.ts");
  assert.match(details,/route===COLLECTIONS_ROUTE/);
  assert.match(dashboard,/rememberDetailsOrigin\(\{\s*route:COLLECTIONS_ROUTE/);
  assert.match(dashboard,/onOpenGame=\{game=>\{/);
  assert.match(dashboard,/if\(collectionsMode\|\|viewAll\|\|!detailsReturn/);
});

test("Existing library navigation, Search, Appearance and native focus unaffected",()=>{
  assert.match(dashboard,/onMove=\{button=>moveInGrid\(index,button\)\}/);
  assert.match(dashboard,/initialMode==="appearance"\s*\? <AppearancePage/);
  assert.match(dashboard,/<LibrarySearchToolbar/);
  assert.match(read("system-theme/settings-gamepad-focus.css"),/background:#163a5e !important/);
  assert.match(page,/showNativeGameOptions\(game\.id,event\.currentTarget\)/);
});
