import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

import {
  HOME_ROUTE,DASHBOARD_ROUTE,LIBRARY_ROUTE,
  rememberDetailsOrigin,peekDetailsOrigin,consumeDetailsOrigin,
  returnDestinationFromHome,clearDetailsOrigin,
} from "../src/detailsReturn.ts";

const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const dashboard=source("src/Dashboard.tsx");
const index=source("src/index.tsx");

const origin=(overrides={})=>({
  route:LIBRARY_ROUTE,tabId:"Steam",gameId:1091500,
  viewAll:true,gridLimit:180,gridScrollTop:1302,
  gridFocusIndex:75,...overrides
});

test.afterEach(()=>clearDetailsOrigin());

test("B from Steam Game Details returns to original full Midnight Steam grid",()=>{
  const ctx=origin();
  rememberDetailsOrigin(ctx);
  assert.equal(returnDestinationFromHome(),LIBRARY_ROUTE);
  assert.equal(peekDetailsOrigin(LIBRARY_ROUTE).tabId,"Steam");
  assert.equal(peekDetailsOrigin(LIBRARY_ROUTE).gridScrollTop,1302);
  assert.equal(peekDetailsOrigin(HOME_ROUTE),null);
  assert.equal(consumeDetailsOrigin(HOME_ROUTE),null,
    "The unexpected Home route must never consume the real grid origin");
  assert.deepEqual(consumeDetailsOrigin(LIBRARY_ROUTE),ctx);
  assert.equal(consumeDetailsOrigin(LIBRARY_ROUTE),null);
  assert.equal(returnDestinationFromHome(),null,
    "One-shot return must not redirect later visits to Home");
});

test("B from Home carousel returns Home without redirect or losing game/tab",()=>{
  const ctx=origin({route:HOME_ROUTE,tabId:"Installed",
    gameId:367520,viewAll:false,gridLimit:60,
    gridScrollTop:0,gridFocusIndex:3});
  rememberDetailsOrigin(ctx);
  assert.equal(returnDestinationFromHome(),null);
  assert.deepEqual(consumeDetailsOrigin(HOME_ROUTE),ctx);
  assert.equal(returnDestinationFromHome(),null);
});

test("Home View More grid is restored as grid, not collapsed into carousel",()=>{
  const ctx=origin({route:HOME_ROUTE,viewAll:true,gridFocusIndex:210,
    gridLimit:240,gridScrollTop:2450});
  rememberDetailsOrigin(ctx);
  const restored=consumeDetailsOrigin(HOME_ROUTE);
  assert.equal(restored.viewAll,true);
  assert.equal(restored.gridFocusIndex,210);
  assert.equal(restored.gridLimit,240);
  assert.equal(restored.gridScrollTop,2450);
});

test("Dashboard launched from QAM is distinct from standard Home",()=>{
  const ctx=origin({route:DASHBOARD_ROUTE,viewAll:false,tabId:"Epic"});
  rememberDetailsOrigin(ctx);
  assert.equal(returnDestinationFromHome(),DASHBOARD_ROUTE);
  assert.equal(consumeDetailsOrigin(HOME_ROUTE),null);
  assert.equal(consumeDetailsOrigin(DASHBOARD_ROUTE).tabId,"Epic");
});

test("Unarmed native Steam Game Details do not change its original Back behavior",()=>{
  assert.equal(returnDestinationFromHome(),null);
  assert.equal(peekDetailsOrigin(LIBRARY_ROUTE),null);
  assert.equal(consumeDetailsOrigin(HOME_ROUTE),null);
});

test("Only known safe plugin routes and valid game identifiers may be stored",()=>{
  rememberDetailsOrigin(origin({route:"/settings"}));
  assert.equal(returnDestinationFromHome(),null);
  rememberDetailsOrigin(origin({gameId:0}));
  assert.equal(returnDestinationFromHome(),null);
  rememberDetailsOrigin(origin({gameId:NaN}));
  assert.equal(returnDestinationFromHome(),null);
  rememberDetailsOrigin(origin({gameId:2**32}));
  assert.equal(returnDestinationFromHome(),null);
  rememberDetailsOrigin(origin({tabId:"X".repeat(181)}));
  assert.equal(returnDestinationFromHome(),null);
  rememberDetailsOrigin(origin({gridLimit:-15,gridScrollTop:-50,gridFocusIndex:-9}));
  const saved=consumeDetailsOrigin(LIBRARY_ROUTE);
  assert.equal(saved.gridLimit,60);
  assert.equal(saved.gridScrollTop,0);
  assert.equal(saved.gridFocusIndex,0);
});

test("Return snapshot expires and will not hijack Home hours later",()=>{
  const now=Date.now;
  try {
    Date.now=()=>1_000_000;
    rememberDetailsOrigin(origin());
    Date.now=()=>1_000_000+2*60*60*1000+100;
    assert.equal(returnDestinationFromHome(),null);
    assert.equal(peekDetailsOrigin(LIBRARY_ROUTE),null);
  } finally {
    Date.now=now;
  }
});

test("Dashboard captures return immediately before native Steam details",()=>{
  assert.match(dashboard,/rememberDetailsOrigin\(\{[\s\S]*?route:actualRoute,[\s\S]*?tabId:tab\.id,[\s\S]*?gameId:game\.id,[\s\S]*?viewAll,[\s\S]*?gridLimit,[\s\S]*?gridScrollTop:/);
  assert.match(dashboard,/const openGameDetails=\\(game:LibraryGame\\)=>\\{[\\s\\S]*?setSteamDetailsGame\\(game\\);/);
  assert.match(dashboard,/const openNativeGameDetails=\\(game:LibraryGame\\)=>\\{\\s*rememberGameDetails\\(game\\);\\s*openDetails\\(game\\);/);
  assert.match(dashboard,/onNativeDetails=\\{\\(\\)=>openNativeGameDetails\\(steamDetailsGame\\)\\}/);
  assert.match(dashboard,/onBack=\\{closeSteamDetails\\}/);
  assert.match(dashboard,/openGameDetails\(entry.steam\)/);
  assert.match(dashboard,/onActivate=\{\(\) => openGameDetails\(selected\)\}/);
  assert.match(dashboard,/if\(!game\.installed\)rememberGameDetails\(game\);/);
  assert.match(dashboard,/onActivate=\{\(\) => runGameAction\(selected\)\}/);
  assert.doesNotMatch(dashboard,/onActivate=\{\(\) => Navigation\.Navigate\("\/library\/home"\)\}/);
});

test("Fullscreen grid and Home restore tab, selected game, batch size, scroll and focus",()=>{
  assert.match(dashboard,/detailsReturn\?\.tabId/);
  assert.match(dashboard,/detailsReturn\?\.gameId/);
  assert.match(dashboard,/detailsReturn\?\.viewAll/);
  assert.match(dashboard,/detailsReturn\?\.gridLimit/);
  assert.match(dashboard,/restorePending\.current/);
  assert.match(dashboard,/gridShown\.findIndex\(entry=>entry.store==="steam"&&/);
  assert.match(dashboard,/fullGridScrollRef\.current\.scrollTop=snapshot\.gridScrollTop/);
  assert.match(dashboard,/focusGrid\(target\)/);
  assert.match(dashboard,/gameRefs\.current\[index\]/);
  assert.match(dashboard,/const \[detailsReturn\]=useState\(\(\)=>peekDetailsOrigin\(actualRoute\)\)/);
  assert.match(dashboard,/if\(detailsReturn\)consumeDetailsOrigin\(actualRoute\);/);
});

test("Saved custom tab survives Steam login and restores correct focus",()=>{
  assert.match(dashboard,/restorePending\.current/);
  assert.match(dashboard,/tabInfo\.reason==="Waiting for Steam account"/);
  assert.match(dashboard,/restorePending\.current\?\.tabId===activeTab/);
  assert.match(dashboard,/if\(tabs\.some\(t=>t\.id===activeTab\)\)return/);
  assert.match(dashboard,/setActiveTab\(tabs\[0\]\?\.id \?\? "AllGames"\)/);
  assert.match(dashboard,/\[initialMode,viewAll,tab\.id,activeTab,gridShown\.length,gridLimit\]/);
});

test("Native Steam Game Details B is handled on return route, not globally rebound",()=>{
  assert.match(index,/function HomeReturnGate/);
  assert.match(index,/returnDestinationFromHome\(\)/);
  assert.match(index,/if\(destination\)Navigation\.Navigate\(destination\)/);
  assert.match(index,/if\(!defaultHome\)return <>\{native\}<\/>;/);
  assert.match(index,/routerHook\.addPatch\(HOME_ROUTE/);
  assert.match(index,/routerHook\.addRoute\(DASHBOARD_ROUTE,/);
  assert.match(index,/routerHook\.addRoute\(LIBRARY_ROUTE,/);
  assert.match(index,/clearDetailsOrigin\(\)/);
  assert.doesNotMatch(index,/addEventListener\(["'](?:keydown|gamepadbuttondown)/);
  assert.doesNotMatch(index,/GamepadButton\.CANCEL/);
  assert.match(dashboard,/showNativeGameOptions\(game\.id,e\.currentTarget\)/,
    "The approved native Start game menu stays unchanged");
});
