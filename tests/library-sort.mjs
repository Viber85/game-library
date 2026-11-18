import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {
  SORT_OPTIONS,SORT_CRITERIA_COUNT,sortGames,sortLabel,defaultSortForTab,
  sortForTab,externalSortKind
} from "../src/homeSort.ts";
import {readNativeSortFields} from "../src/nativeSortFields.ts";

const game=(id,title,props={})=>({
  id,title,installed:true,favorite:false,nonSteam:false,
  lastPlayed:0,playtimeMinutes:0,...props
});
const names=games=>games.map(g=>g.title);
const games=[
  game(1,"A",{
    lastPlayed:80,playtimeMinutes:200,addedAt:1000,releaseDate:2000,sizeBytes:100,
    achievementsUnlocked:8,achievementsTotal:10}),
  game(2,"B",{
    lastPlayed:120,playtimeMinutes:15,addedAt:3000,releaseDate:6000,sizeBytes:600,
    achievementsUnlocked:0,achievementsTotal:10}),
  game(3,"C",{lastPlayed:0,playtimeMinutes:0}),
];
const data={
  hltb:new Map([[1,25],[2,9],[3,null]]),
  proton:new Map([[1,5],[2,2],[3,null]]),
  achievement:new Map([[1,80],[2,0],[3,null]])
};

test("Exactly 11 sorting criteria, directions are variants; no Random",()=>{
  assert.equal(SORT_CRITERIA_COUNT,11);
  assert.equal(SORT_OPTIONS.length,17);
  assert.ok(!SORT_OPTIONS.some(x=>/random|shuffle/i.test(x.label+" "+x.id)));
  for(const option of SORT_OPTIONS)assert.ok(sortLabel(option.id).length>0);
});

test("Basic, playtime, and never-played sorting uses actual Steam timestamps",()=>{
  assert.deepEqual(names(sortGames(games,"recent",data)),["B","A","C"]);
  assert.deepEqual(names(sortGames(games,"alphabetical",data)),["A","B","C"]);
  assert.deepEqual(names(sortGames(games,"alphabetical-desc",data)),["C","B","A"]);
  assert.deepEqual(names(sortGames(games,"most-played",data)),["A","B","C"]);
  assert.deepEqual(names(sortGames(games,"least-played",data)),["C","B","A"]);
  assert.deepEqual(names(sortGames(games,"never-played",data)),["C","A","B"]);
});

test("Added, native release date, and real size-on-disk sort without inventing unknowns",()=>{
  assert.deepEqual(names(sortGames(games,"recently-added",data)),["B","A","C"]);
  assert.deepEqual(names(sortGames(games,"release-new",data)),["B","A","C"]);
  assert.deepEqual(names(sortGames(games,"release-old",data)),["A","B","C"]);
  assert.deepEqual(names(sortGames(games,"size-small",data)),["A","B","C"]);
  assert.deepEqual(names(sortGames(games,"size-large",data)),["B","A","C"]);
});

test("HLTB sorting uses Main + Extras only, short/long, missing always at end",()=>{
  assert.equal(externalSortKind("hltb-short"),"hltb");
  assert.deepEqual(names(sortGames(games,"hltb-short",data)),["B","A","C"]);
  assert.deepEqual(names(sortGames(games,"hltb-long",data)),["A","B","C"]);
  assert.deepEqual(names(sortGames(games,"hltb-short")),["A","B","C"],
    "If missing, no fictional HLTB time is used");
});

test("ProtonDB, achievement progress direction and missing values last",()=>{
  assert.deepEqual(names(sortGames(games,"proton-high",data)),["A","B","C"]);
  assert.deepEqual(names(sortGames(games,"proton-low",data)),["B","A","C"]);
  assert.deepEqual(names(sortGames(games,"achievement-high",data)),["A","B","C"]);
  assert.deepEqual(names(sortGames(games,"achievement-low",data)),["B","A","C"]);
  // A valid 0% must outrank an unknown entry on ascending achievement sort.
  assert.deepEqual(names(sortGames([game(4,"Unknown",{achievementsTotal:0}),games[1]],
    "achievement-low",data)),["B","Unknown"]);
});

test("Steam overview uses real documented protobuf keys for added, release, size",()=>{
  assert.deepEqual(readNativeSortFields({
    rt_purchased_time:99,rt_original_release_date:123,rt_steam_release_date:444,
    size_on_disk:21474836480
  }),{addedAt:99,releaseDate:123,sizeBytes:21474836480});
  assert.deepEqual(readNativeSortFields({
    rt_original_release_date:0,rt_steam_release_date:777,
    size_on_disk:"123456789"
  }),{addedAt:undefined,releaseDate:777,sizeBytes:123456789});
  assert.deepEqual(readNativeSortFields({
    rt_purchased_time:0,rt_original_release_date:null,size_on_disk:-44
  }),{addedAt:undefined,releaseDate:undefined,sizeBytes:undefined});
  assert.equal(readNativeSortFields({size_on_disk:"not bytes"}).sizeBytes,undefined);
  assert.equal(readNativeSortFields({size_on_disk:1e30}).sizeBytes,undefined);
});

test("Tab-specific defaults and overrides work across Home and Library routes",()=>{
  const installed={id:"Installed",title:"Installed"},all={id:"AllGames",title:"All Games"};
  assert.equal(defaultSortForTab(installed),"recent");
  assert.equal(defaultSortForTab(all),"alphabetical");
  const overrides={Installed:"hltb-short",AllGames:"size-large"};
  assert.equal(sortForTab(installed,overrides),"hltb-short");
  assert.equal(sortForTab(all,overrides),"size-large");
  assert.equal(sortForTab({id:"Epic",title:"Epic"},overrides),"alphabetical");
});

test("Midnight Library link uses its own Decky route, never overrides Steam native /library",()=>{
  const ui=readFileSync(new URL("../src/Dashboard.tsx",import.meta.url),"utf8");
  const plugin=readFileSync(new URL("../src/index.tsx",import.meta.url),"utf8");
  assert.match(ui,/id: "library".*?go: \(\) => Navigation.Navigate\(LIBRARY_ROUTE\)/);
  assert.match(ui,/const LIBRARY_ROUTE = "\/game-library\/library"/);
  assert.match(plugin,/routerHook.addRoute\(LIBRARY_ROUTE,/);
  assert.match(plugin,/routerHook.removeRoute\(LIBRARY_ROUTE\)/);
  assert.doesNotMatch(plugin,/routerHook.addPatch\("\/library"/);
  assert.match(ui,/Navigation.Navigate\("\/library"\)/);
  assert.match(ui,/initialMode==="library"/);
  assert.match(ui,/onCancel=\{exitGrid\}/);
  assert.match(ui,/SORT_OPTIONS.map/);
  assert.match(ui,/onCancelButton=\{closeSortMenu\}/);
});

test("External sorts are lazy, rate-limited, and use HLTB comp_plus only",()=>{
  const service=readFileSync(new URL("../src/sortMetadata.ts",import.meta.url),"utf8");
  assert.match(service,/result\.data\?\.extras/);
  assert.match(service,/const count=kind==="hltb"\?1/);
  assert.match(service,/kind==="hltb"\?650:250/);
  assert.match(service,/if\(cancelled\)return/);
  assert.match(service,/onProgress\(\)/);
  assert.doesNotMatch(service,/result\.data\?\.main\s*\+|\.completionist\s*\+/);
});
