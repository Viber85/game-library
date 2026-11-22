import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  GAME_DETAILS_ROUTE,stageGameDetailsRoute,readGameDetailsRoute,
  clearGameDetailsRoute
} from "../src/gameDetailsRoute.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const game={id:1091500,title:"Test Steam Game",installed:false};
const session=(originRoute="/game-library/library",originMode="library")=>({
  game,originRoute,originMode,
  target:{gameId:game.id,kind:originMode==="collections"?"collections":
    originMode==="library"||originMode==="search"?"grid":"home-action",
    index:32,scrollTop:780}
});

test.afterEach(()=>clearGameDetailsRoute());

test("custom Game Details is a real native history route, not temporary Library state",()=>{
  assert.equal(GAME_DETAILS_ROUTE,"/game-library/game-details");
  const main=read("src/index.tsx");
  const dashboard=read("src/Dashboard.tsx");
  assert.match(main,/routerHook\.addRoute\(GAME_DETAILS_ROUTE, RoutedGameDetails,\{exact:true\}\)/);
  assert.match(main,/routerHook\.removeRoute\(GAME_DETAILS_ROUTE\)/);
  assert.match(main,/return <Dashboard initialMode=\{session\.originMode\}\s+detailRouteSession=\{session\}\/>/);
  assert.match(dashboard,/stageGameDetailsRoute\(\{/);
  assert.match(dashboard,/rememberGameDetails\(game\);\s*Navigation\.Navigate\(GAME_DETAILS_ROUTE\)/);
  assert.match(dashboard,/if\(detailRouteSession\)\{\s*\/\/ Restore the original selected game\/grid/);
  assert.match(dashboard,/clearGameDetailsRoute\(\);[\s\S]*?Navigation\.NavigateBack\(\)/);
});

test("B after HLTB or Store naturally pops to same actual Game Details route",()=>{
  const dashboard=read("src/Dashboard.tsx");
  const start=dashboard.indexOf('const openGameDetailsWeb=');
  const end=dashboard.indexOf('const openNativeGameDetails=',start);
  assert.ok(start>0&&end>start);
  const action=dashboard.slice(start,end);
  assert.match(action,/if\(detailRouteSession\)\{/);
  assert.match(action,/if\(kind==="hltb"\)Navigation\.NavigateToExternalWeb\(url\)/);
  assert.match(action,/else Navigation\.NavigateToSteamWeb\(url\)/);
  const first=action.slice(action.indexOf("if(detailRouteSession){"),
    action.indexOf("const target=steamReturnTarget.current;"));
  assert.doesNotMatch(first,/armGameDetailsWebReturn|rememberGameDetails|armControllerSettingsReturn/);
  assert.match(dashboard,/if\(detailRouteSession\)\{\s*\/\/ This page is now a native history entry/);
  assert.match(dashboard,/void openSteamControllerEditor\(game\.id\)/);
  assert.match(read("src/SteamGameDetails.tsx"),/onOpenHltb\(hltbLink\)/);
  assert.match(read("src/SteamGameDetails.tsx"),/isNativeSteam\?onOpenStore:onNativeDetails/);
});

test("active game session survives Steam native route transitions until actual Game Details B",()=>{
  assert.equal(stageGameDetailsRoute(session(),1000),true);
  const first=readGameDetailsRoute(1100);
  assert.deepEqual(first,session());
  // Returning from native Controller Settings, HLTB, Steam Store must not
  // consume the session or reset the previous game.
  assert.deepEqual(readGameDetailsRoute(2000),session());
  clearGameDetailsRoute();
  assert.equal(readGameDetailsRoute(2200),null);
});

test("preserves Home/Library/Search/Collections origin and previous game card",()=>{
  for(const [route,mode] of [
    ["/library/home","home"],["/game-library/dashboard","home"],
    ["/game-library/library","library"],
    ["/game-library/search","search"],
    ["/game-library/collections","collections"]
  ]){
    clearGameDetailsRoute();
    const input=session(route,mode);
    assert.equal(stageGameDetailsRoute(input,5000),true);
    assert.deepEqual(readGameDetailsRoute(5500),input);
  }
});

test("refuses stale, invalid or mismatched sessions",()=>{
  assert.equal(stageGameDetailsRoute(session(),1),true);
  assert.equal(readGameDetailsRoute(60*60*1000+2),null);
  for(const invalid of [
    {...session(),originRoute:"/app/55/controllerconfigurator/main"},
    {...session(),game:{...game,id:0}},
    {...session(),game:{...game,id:2**32}},
    {...session(),target:{...session().target,gameId:730}},
    {...session(),target:{...session().target,index:-1}},
    {...session(),target:{...session().target,scrollTop:NaN}}
  ])assert.equal(stageGameDetailsRoute(invalid,100),false);
});
