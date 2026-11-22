import assert from "node:assert/strict";
import test from "node:test";
import {
  armControllerSettingsReturn,consumeControllerSettingsReturn,
  clearControllerSettingsReturn
} from "../src/controllerSettingsReturn.ts";
import {readFileSync} from "node:fs";

const target={kind:"grid",gameId:1091500,index:55,scrollTop:1440};
const make=(route="/game-library/library",overrides={})=>({
  route,appId:1091500,target:{...target},...overrides
});

test.afterEach(()=>clearControllerSettingsReturn());

test("B from native Steam Controller Settings reopens same Game Details exactly once",()=>{
  assert.equal(armControllerSettingsReturn(make(),1000),true);
  assert.equal(consumeControllerSettingsReturn("/game-library/dashboard",1100),null,
    "unrelated Dashboard route must not steal a Library return");
  assert.deepEqual(consumeControllerSettingsReturn("/game-library/library",1200),make());
  assert.equal(consumeControllerSettingsReturn("/game-library/library",1300),null,
    "one-shot: pressing B again must close own Details to Library, not reopen it");
});

test("native Settings B restores Game Details from actual Home, Search and Collections",()=>{
  for(const [route,kind] of [
    ["/library/home","home-action"],
    ["/game-library/dashboard","home-card"],
    ["/game-library/search","grid"],
    ["/game-library/collections","collections"]
  ]){
    const snapshot=make(route,{target:{...target,kind}});
    assert.equal(armControllerSettingsReturn(snapshot,10_000),true,route);
    assert.deepEqual(consumeControllerSettingsReturn(route,10_050),snapshot,route);
  }
});

test("invalid IDs, paths, corrupt card identity and aged sessions never reroute B",()=>{
  for(const invalid of [
    make("/settings"),
    make("/some/native/steam/details"),
    make("/game-library/library",{appId:0}),
    make("/game-library/library",{appId:2**32}),
    make("/game-library/library",{target:{...target,gameId:5}}),
    make("/game-library/library",{target:{...target,index:-1}}),
    make("/game-library/library",{target:{...target,scrollTop:NaN}}),
  ])assert.equal(armControllerSettingsReturn(invalid,0),false,JSON.stringify(invalid));
  assert.equal(armControllerSettingsReturn(make(),5_000),true);
  assert.equal(consumeControllerSettingsReturn("/game-library/library",5_000+10*60*1000+1),null);
  assert.equal(consumeControllerSettingsReturn("/game-library/library",5_100),null);
});

test("failed controller navigation clears only corresponding app token",()=>{
  assert.equal(armControllerSettingsReturn(make(),100),true);
  clearControllerSettingsReturn(730);
  assert.deepEqual(consumeControllerSettingsReturn("/game-library/library",110),make());
  assert.equal(armControllerSettingsReturn(make(),100),true);
  clearControllerSettingsReturn(1091500);
  assert.equal(consumeControllerSettingsReturn("/game-library/library",110),null);
});

test("real Dashboard arms return before leaving and restores same card state",()=>{
  const source=readFileSync(new URL("../src/Dashboard.tsx",import.meta.url),"utf8");
  assert.match(source,/armControllerSettingsReturn\(\{route:actualRoute,appId:game.id,target\}\)/);
  assert.match(source,/rememberGameDetails\(game\);\s*void openSteamControllerEditor\(game.id\)/);
  assert.match(source,/const steamReturnTarget=useRef<GameDetailsReturnTarget\|null>\(\s*detailRouteSession\?\.target\?\?controllerReturn\?\.target\?\?null\)/);
  assert.match(source,/const \[controllerReturn\]=useState\(\(\)=>detailRouteSession\?null:consumeControllerSettingsReturn\(actualRoute\)\)/);
});

test("second B closes restored Game Details once; delayed inventory cannot reopen it",()=>{
  const dashboard=readFileSync(new URL("../src/Dashboard.tsx",import.meta.url),"utf8");
  assert.match(dashboard,
    /const controllerRestorePending=useRef\(Boolean\(controllerReturn&&!steamDetailsGame\)\)/);
  assert.match(dashboard,
    /if\(!controllerRestorePending\.current\|\|!controllerReturn\)return;/);
  assert.match(dashboard,
    /if\(!restored\)return;\s*controllerRestorePending\.current=false;\s*setSteamDetailsGame\(restored\);/);
  assert.match(dashboard,
    /const closeSteamDetails=\(\)=>\{[\s\S]*?controllerRestorePending\.current=false;[\s\S]*?setSteamDetailsGame\(null\);/);
  assert.doesNotMatch(dashboard,/if\(!controllerReturn\|\|steamDetailsGame\)return;/,
    "Old effect re-opened Details immediately after the user pressed B");
  assert.match(dashboard,/onBack=\{closeSteamDetails\}/);
});

test("focus bridge remains unchanged for Details and both directions of sidebar",()=>{
  const dashboard=readFileSync(new URL("../src/Dashboard.tsx",import.meta.url),"utf8");
  const details=readFileSync(new URL("../src/SteamGameDetails.tsx",import.meta.url),"utf8");
  assert.match(dashboard,/useNativeMenuGamepad\(steamDetailsGame\|\|gogDetailsId\?"details":nativeMenuKind,nativeMenuRoot\)/);
  assert.match(dashboard,/focusNativeMenuControl\(back,GamepadButton\.DIR_RIGHT\)/);
  assert.match(dashboard,/focusNativeMenuControl\(railRefs\.current\[target\],GamepadButton\.DIR_LEFT\)/);
  assert.match(details,/else if\(direction==="left"\)onFocusRail\(\)/);
});
