import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync,existsSync} from "node:fs";
import {
  combineDashboardEntries,combineSearchEntries,searchGogEntries,
} from "../src/dashboardCatalog.ts";
import {
  DEFAULT_LIBRARY_TABS,withGogBuiltin,visibleLibraryTabs,moveLibraryTab,
  changeLibraryTab,gamesForLibraryTab,
} from "../src/libraryTabs.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const native=[{id:1,title:"Cyberpunk",installed:true,nonSteam:false,favorite:false,
  lastPlayed:123,playtimeMinutes:100}];
const gog=[
  {id:"123",title:"A New Hope",image:"",background:""},
  {id:"987",title:"Cyberpunk",image:"",background:""},
];

test("GOG is a movable, persistent built-in tab visible in Tab Manager",()=>{
  const ids=DEFAULT_LIBRARY_TABS.map(x=>x.id);
  assert.ok(ids.includes("GOG"));
  const gogTab=DEFAULT_LIBRARY_TABS.find(x=>x.id==="GOG");
  assert.equal(gogTab.kind,"gog");
  assert.equal(gogTab.visible,true);
  const ordered=moveLibraryTab(DEFAULT_LIBRARY_TABS,"GOG",-1);
  assert.equal(ordered.findIndex(x=>x.id==="GOG"),
    DEFAULT_LIBRARY_TABS.findIndex(x=>x.id==="GOG")-1);
  const hidden=changeLibraryTab(ordered,"GOG",{visible:false});
  assert.ok(!visibleLibraryTabs(hidden).some(x=>x.id==="GOG"));
  assert.deepEqual(gamesForLibraryTab(gogTab,native).games,[]);
  const old=DEFAULT_LIBRARY_TABS.filter(x=>x.id!=="GOG");
  const migrated=withGogBuiltin(old);
  assert.equal(migrated.length,DEFAULT_LIBRARY_TABS.length);
  assert.equal(migrated[migrated.length-1].id,"GOG");
  const backend=read("main.py");
  assert.match(backend,/\("GOG", "GOG", "gog"\)/);
  assert.match(backend,/if isinstance\(profile, list\) and not any\(/);
  assert.match(backend,/return _own_tab_validate\(profile\)/);
  const manager=read("src/TabManager.tsx");
  assert.match(manager,/tab.kind==="gog"\?"GOG · Owned library"/);
  assert.match(manager,/moveLibraryTab\(items,selected.id,-1\)/);
  assert.match(manager,/changeLibraryTab\(items,selected.id,\{visible:!selected.visible\}\)/);
});

test("All Games, GOG and Search use store-scoped IDs in same Dashboard grid",()=>{
  const combined=combineDashboardEntries(native,gog,"AllGames","alphabetical");
  assert.deepEqual(combined.map(e=>e.key),["gog:123","steam:1","gog:987"]);
  assert.deepEqual(combineDashboardEntries(native,gog,"GOG","alphabetical")
    .map(e=>e.key),["gog:123","gog:987"]);
  assert.deepEqual(combineDashboardEntries(native,gog,"Steam","alphabetical")
    .map(e=>e.key),["steam:1"]);
  assert.deepEqual(searchGogEntries(gog,"a","gog","all").map(e=>e.key),["gog:123"]);
  assert.deepEqual(searchGogEntries(gog,"cy","gog","all").map(e=>e.key),["gog:987"]);
  assert.deepEqual(searchGogEntries(gog,"cy","steam","all"),[]);
  assert.deepEqual(searchGogEntries(gog,"cy","all","not-installed"),[]);
  assert.deepEqual(combineSearchEntries(native,
    searchGogEntries(gog,"cy","all","all"),"alphabetical")
    .map(e=>e.key),["steam:1","gog:987"]);
});

test("GOG no longer uses an independent page or a fake Steam launch",()=>{
  const dashboard=read("src/Dashboard.tsx");
  const card=read("src/GogDashboardCard.tsx");
  const provider=read("src/useGogDashboardCatalog.ts");
  assert.equal(existsSync(new URL("../src/GogLibraryPage.tsx",import.meta.url)),false);
  assert.doesNotMatch(dashboard,/GogLibraryPage|GOG_TAB/);
  assert.match(dashboard,/const gridShown=useMemo\(\(\)=>\{/);
  assert.match(dashboard,/renderEntry\(entry,index,"grid"\)/);
  assert.match(dashboard,/renderEntry\(entry,index,"home"\)/);
  assert.match(dashboard,/detailGog \? <SharedLibraryDetails/);
  assert.match(dashboard,/onBack=\{closeGogDetails\}/);
  assert.match(provider,/get_gog_library/);
  assert.match(provider,/setInterval\(\(\)=>\{void load\(\);\},30000\)/);
  assert.match(card,/onButtonDown=\{direction\}/);
  assert.match(card,/GogArtwork game=\{entry.gog\}/);
  assert.doesNotMatch(card,/SteamClient|RunGame|Install/);
});

test("Single grid focus and alphabet are store-safe; GOG cannot become installed by default",()=>{
  const ui=read("src/Dashboard.tsx");
  const alphabet=read("src/LibraryAlphabetIndicator.tsx");
  const model=read("src/unifiedLibraryGame.ts");
  assert.match(ui,/getGridColumnCount\(fullGridLayoutRef.current\)/);
  assert.match(ui,/gridNeighbor\(index,gridShown.length,columns,direction\)/);
  assert.match(ui,/focusedGameKey=\{selectedGridKey\}/);
  assert.match(alphabet,/focusedGameKey\?:string/);
  assert.match(model,/availability:"unknown"/);
  assert.match(model,/capabilities:\["details"\]/);
});
