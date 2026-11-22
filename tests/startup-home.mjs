import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  safeStartupHomeRoute,shouldOpenStartupHome,scheduleStartupHomeRedirect,
  GAME_LIBRARY_HOME_ROUTE
} from "../src/startupHome.ts";

const base=(override={})=>({
  enabled:true,route:"/library/home",documentUptimeMs:8000,
  gameRunning:false,overlayVisible:false,userInteracted:false,
  homePatchReady:true,...override
});

test("Steam Home starts Game Library only on fresh, untouched Game Mode",()=>{
  assert.equal(shouldOpenStartupHome(base()),true);
  assert.equal(shouldOpenStartupHome(base({route:"/routes/library/home"})),true);
  assert.equal(shouldOpenStartupHome(base({route:"/routes/index.html"}),true),false);
  assert.equal(shouldOpenStartupHome(base({route:"/routes/index.html"}),true),true);
  assert.equal(safeStartupHomeRoute("/routes/index.html",false),false);
  assert.equal(safeStartupHomeRoute("/",true),true);
  assert.equal(safeStartupHomeRoute("/library/app/1091500",true),false);
});

test("never hijack a game, native Details, Settings, QAM or manual navigation",()=>{
  for(const blocked of [
    {enabled:false},{homePatchReady:false},{gameRunning:true},
    {overlayVisible:true},{userInteracted:true},
    {documentUptimeMs:240000},{documentUptimeMs:NaN},
    {route:"/library/app/1091500"},{route:"/settings"},
    {route:"/game-library/library"},{route:"/store"}
  ])assert.equal(shouldOpenStartupHome(base(blocked)),false,JSON.stringify(blocked));
});

test("exactly one delayed navigation after the saved setting and route are unchanged",()=>{
  let active=base();
  const scheduled=[];
  const navigated=[];
  const cancel=scheduleStartupHomeRedirect({
    getEvidence:()=>active,homeVisible:()=>false,
    navigate:path=>navigated.push(path),
    setTimer:(fn,ms)=>{scheduled.push({fn,ms});return 7;},
    clearTimer:()=>{throw Error("timer should have fired");}
  });
  assert.equal(scheduled.length,1);
  assert.ok(scheduled[0].ms>=300);
  scheduled[0].fn();
  scheduled[0].fn();
  cancel();
  assert.deepEqual(navigated,[GAME_LIBRARY_HOME_ROUTE]);
});

test("abort if user navigates, starts game, opens QAM or uses controller before timer",()=>{
  for(const changed of [
    {route:"/library/app/730"},{gameRunning:true},{overlayVisible:true},
    {userInteracted:true},{enabled:false},{homePatchReady:false}
  ]){
    let current=base();
    let pending;
    let count=0;
    scheduleStartupHomeRedirect({
      getEvidence:()=>current,homeVisible:()=>false,
      navigate:()=>count++,
      setTimer:fn=>{pending=fn;return 9;},
      clearTimer:()=>{}
    });
    current=base(changed);
    pending();
    assert.equal(count,0,JSON.stringify(changed));
  }
});

test("unload cancels timer and never opens Home after the plugin disappears",()=>{
  let pending,cleared=0,nav=0;
  const stop=scheduleStartupHomeRedirect({
    getEvidence:()=>base(),homeVisible:()=>false,
    navigate:()=>nav++,
    setTimer:fn=>{pending=fn;return 6;},
    clearTimer:id=>{assert.equal(id,6);cleared++;}
  });
  stop();
  pending();
  assert.equal(cleared,1);
  assert.equal(nav,0);
});

test("integration is one-shot at saved startup setting, not a global route patch",()=>{
  const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
  const index=read("src/index.tsx");
  const adapter=read("src/startupHomeBrowser.ts");
  const backend=read("main.py");
  assert.match(index,/cancelStartupHome=startBrowserStartupHome\(/);
  assert.match(index,/defaultHome = saved\.default_home !== false;/);
  assert.match(index,/routerHook\.addPatch\(HOME_ROUTE/);
  assert.match(index,/cancelStartupHome\(\);\s*stopAutoTabSource\(\);/);
  assert.match(adapter,/readRunningGame\(steam,\(window as any\)\.appStore\)/);
  assert.match(adapter,/document\.removeEventListener\("gamepadbuttondown",onUserInput,true\)/);
  assert.match(adapter,/window\.performance\?\.now\?\.\(\)/);
  assert.match(backend,/default_home", True/);
});
