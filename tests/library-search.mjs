import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {searchLibraryGames,gameSearchSource,normalizeSearchText} from "../src/librarySearch.ts";
import {rememberSearchOrigin,searchBackRoute,saveSearchSelection,readSearchSelection} from "../src/searchNavigation.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const game=(id,title,nonSteam,installed)=>({id,title,nonSteam,installed,favorite:false,
  lastPlayed:0,playtimeMinutes:0});
const library=[
  game(1,"South Park: The Stick of Truth",false,true),
  game(2,"Clair Obscur: Expedition 33",true,true),
  game(3,"Cyberpunk 2077",false,false),
  game(4,"Hades",true,true),
  game(5,"Živio – Test",true,false),
  game(6,"GOG Galaxy",true,false),
];
const collections={epic:new Set([2,4]),gog:new Set([5,6])};

test("One local search covers all Steam + Epic + GOG registered shortcuts",()=>{
  assert.deepEqual(searchLibraryGames(library,"South","all","all",collections).map(x=>x.id),[1]);
  assert.deepEqual(searchLibraryGames(library,"ark","all","all",collections),[]);
  assert.deepEqual(searchLibraryGames(library,"clair","epic","all",collections).map(x=>x.id),[2]);
  assert.deepEqual(searchLibraryGames(library,"HADES","epic","installed",collections).map(x=>x.id),[4]);
  assert.deepEqual(searchLibraryGames(library,"GOG","gog","not-installed",collections).map(x=>x.id),[6]);
  assert.deepEqual(searchLibraryGames(library,"galaxy","gog","not-installed",collections),[]);
  assert.deepEqual(searchLibraryGames(library,"cyber","steam","all",collections).map(x=>x.id),[3]);
  assert.deepEqual(searchLibraryGames(library,"clair","steam","all",collections),[]);
  assert.deepEqual(searchLibraryGames(library,"hades","other","all",collections),[]);
});

test("Source inference is based on native UnifiedDeck membership, never title guesses",()=>{
  assert.equal(gameSearchSource(library[1],collections),"epic");
  assert.equal(gameSearchSource(library[4],collections),"gog");
  assert.equal(gameSearchSource(library[2],collections),"steam");
  assert.equal(gameSearchSource(library[1],{epic:null,gog:null}),"other");
});

test("Case, Croatian diacritics and multiword title prefixes work locally",()=>{
  assert.equal(normalizeSearchText("  ŽIVIO   Čar  "),"zivio car");
  assert.deepEqual(searchLibraryGames(library,"ZIVIO","all","all",collections).map(x=>x.id),[5]);
  assert.deepEqual(searchLibraryGames(library,"South Park","all","all",collections).map(x=>x.id),[1]);
  assert.deepEqual(searchLibraryGames(library,"  souTH   pARk  ","all","all",collections).map(x=>x.id),[1]);
  assert.deepEqual(searchLibraryGames(library,"Stick South","all","all",collections),[]);
  assert.deepEqual(searchLibraryGames(library,"   ","all","all",collections),[]);
});

test("Single letter matches only titles STARTING with that letter",()=>{
  const items=[
    game(10,"The Hobbit",false,true),
    game(11,"Hades",false,true),
    game(12,"Hollow Knight",false,true),
    game(13,"Dark Souls III",false,true),
    game(14,"Hogwarts Legacy",false,false),
    game(15,"Ghost of Tsushima",false,true),
  ];
  assert.deepEqual(searchLibraryGames(items,"h","all","all",{epic:null,gog:null}).map(x=>x.id),
    [11,14,12]);
  assert.deepEqual(searchLibraryGames(items,"ho","all","all",{epic:null,gog:null}).map(x=>x.id),
    [14,12]);
  assert.deepEqual(searchLibraryGames(items,"hobbit","all","all",{epic:null,gog:null}),[]);
  assert.deepEqual(searchLibraryGames(items,"dark so","all","all",{epic:null,gog:null}).map(x=>x.id),[13]);
});

test("Search still prioritizes an exact title and alphabetizes other prefix matches",()=>{
  const items=[game(12,"The Test Game",false,true),game(13,"Tester",false,true),
    game(14,"Test",false,true),game(15,"A test Story",false,false),
    game(16,"Testing Ground",false,true)];
  assert.deepEqual(searchLibraryGames(items,"test","all","all",{epic:null,gog:null}).map(x=>x.id),
    [14,13,16]);
  assert.deepEqual(searchLibraryGames(items,"te","all","all",{epic:null,gog:null}).map(x=>x.id),
    [14,13,16]);
});

test("Prefix search obeys source and installation filters for one-character queries",()=>{
  assert.deepEqual(searchLibraryGames(library,"h","epic","installed",collections).map(x=>x.id),[4]);
  assert.deepEqual(searchLibraryGames(library,"h","steam","all",collections),[]);
  assert.deepEqual(searchLibraryGames(library,"g","gog","not-installed",collections).map(x=>x.id),[6]);
  assert.deepEqual(searchLibraryGames(library,"c","all","all",collections).map(x=>x.id),[2,3]);
  assert.deepEqual(searchLibraryGames(library,"c","steam","not-installed",collections).map(x=>x.id),[3]);
});

test("Search state and origin stay in memory across native Game Details navigation",()=>{
  rememberSearchOrigin("/game-library/library");
  assert.equal(searchBackRoute(),"/game-library/library");
  rememberSearchOrigin("https://example.com");
  assert.equal(searchBackRoute(),"/game-library/library");
  saveSearchSelection({query:"Cyberpunk",source:"steam",installed:"installed"});
  assert.deepEqual(readSearchSelection(),{query:"Cyberpunk",source:"steam",installed:"installed"});
  rememberSearchOrigin("/game-library/appearance");
  assert.equal(searchBackRoute(),"/game-library/appearance");
});

test("Left rail Search uses the internal route and retains Game Details return",()=>{
  const bar=read("src/SystemStatusBar.tsx");
  const dash=read("src/Dashboard.tsx");
  const app=read("src/AppearancePage.tsx");
  const routes=read("src/index.tsx");
  const details=read("src/detailsReturn.ts");
  assert.doesNotMatch(bar,/MdSearch|gl-topbar-search|Navigate\("\/search"\)/);
  assert.match(dash,/\{ id: "search", label: "Search", icon: MdSearch, go: openLocalSearch \}/);
  assert.match(dash,/rememberSearchOrigin\(actualRoute\)/);
  assert.match(dash,/Navigation\.Navigate\(SEARCH_ROUTE\)/);
  assert.match(dash,/initialMode==="search"/);
  assert.match(app,/<SystemStatusBar statusRef=\{statusRef\}/);
  assert.match(routes,/routerHook\.addRoute\(SEARCH_ROUTE/);
  assert.match(routes,/routerHook\.removeRoute\(SEARCH_ROUTE\)/);
  assert.match(details,/route===SEARCH_ROUTE/);
});

test("Search results reuse GameCard, native Start menu, original art and B navigation",()=>{
  const dash=read("src/Dashboard.tsx"),toolbar=read("src/LibrarySearchToolbar.tsx");
  assert.match(dash,/game=\{game\} index=\{index\} captureVertical/);
  assert.match(dash,/activate=\{\(\)=>openGameDetails\(game\)\}/);
  assert.match(dash,/onCancel=\{exitGrid\} onSort=\{showSortMenu\}/);
  assert.match(dash,/returnDestinationFromHome|searchBackRoute\(\)/);
  assert.match(dash,/onMove=\{button=>moveInGrid\(index,button\)\}/);
  assert.match(dash,/showNativeGameOptions\(game\.id,e\.currentTarget\)/);
  assert.match(toolbar,/<TextField aria-label="Search game titles"/);
  assert.match(toolbar,/onChange=\{event=>onQuery\(event\.target\.value\)\}/);
  assert.match(toolbar,/firstFilterRef\.current=el/);
  assert.match(toolbar,/onFocusResults\(\)/);
});

test("Search CSS and route-scoped status bar leave Appearance and native Steam UI intact",()=>{
  const css=read("src/theme.ts");
  const source=css.slice(css.indexOf("/* v0.5.9-test.3"));
  assert.match(source,/\.gl-root \.gl-library-search-controls/);
  assert.match(source,/\.gl-root \.gl-search-page/);
  assert.doesNotMatch(source,/#header|#Footer|body\.|\.BasicUI|#QuickAccess-Menu/);
  assert.match(css,/html:has\(\.gl-root\.gl-own-status-only\) #header/);
  assert.match(read("system-theme/settings-gamepad-focus.css"),/background:#163a5e !important/);
});
