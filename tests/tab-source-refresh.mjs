import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createSourceRefresh } from "../src/tabSourceRefresh.ts";

const flush=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
};
const snap=(enabled,tabs=[])=>({available:enabled,tabs,reason:enabled?"":"Native tabs unavailable"});

test("automatic tab state updates after Decky re-enables native without dashboard remount",async()=>{
  let live=snap(false);
  let calls=0;
  const source=createSourceRefresh(async()=>{calls++;return live;},
    snap(false),JSON.stringify);
  source.start();
  await flush();
  assert.equal(source.getSnapshot().available,false);
  const logs=[];
  const detach=source.subscribe(v=>logs.push(v));
  live=snap(true,[{id:"Epic",title:"EPIC"},{id:"GOG",title:"GOG"}]);
  // The Decky plugin manager can temporarily unmount the Dashboard route.
  // The source controller still exists and receives the new config.
  await source.refresh();
  assert.equal(source.getSnapshot().available,true);
  assert.deepEqual(source.getSnapshot().tabs.map(x=>x.title),["EPIC","GOG"]);
  detach();
  assert.equal(logs.length,1);
  const later=[];
  const detachAgain=source.subscribe(v=>later.push(v));
  assert.equal(source.getSnapshot().tabs[0].id,"Epic");
  live=snap(false);
  await source.refresh();
  assert.equal(source.getSnapshot().available,false);
  assert.equal(later.length,1);
  detachAgain();
  source.stop();
  assert.equal(calls,3);
});

test("pending stale disabled response cannot overwrite newly enabled native tabs",async()=>{
  const old=deferred();
  const current=snap(true,[{id:"GOG",title:"GOG"}]);
  let calls=0;
  const source=createSourceRefresh(
    ()=>{calls++;return calls===1?old.promise:Promise.resolve(current);},
    snap(false),JSON.stringify,
  );
  source.start();
  const changes=[];
  source.subscribe(v=>changes.push(v));
  await source.refresh(); // Marks old in-flight call superseded.
  old.resolve(snap(false));
  await flush();
  await flush();
  assert.equal(calls,2);
  assert.equal(source.getSnapshot().available,true);
  assert.deepEqual(changes,[current],"Stale disabled response must never reach UI");
  source.stop();
});

test("failed and stopped requests do not erase last valid tab state",async()=>{
  let calls=0;
  const late=deferred();
  const good=snap(true,[{id:"Epic",title:"Epic"}]);
  const source=createSourceRefresh(()=>{
    calls++;
    if(calls===1)return Promise.resolve(good);
    if(calls===2)return Promise.reject(new Error("Decky reloading"));
    return late.promise;
  },snap(false),JSON.stringify);
  source.start();
  await flush();
  assert.equal(source.getSnapshot().available,true);
  const warn=console.warn;
  try{
    console.warn=()=>{};
    await source.refresh();
  }finally{console.warn=warn;}
  assert.equal(source.getSnapshot().available,true);
  const p=source.refresh();
  source.stop();
  late.resolve(snap(false));
  await p;
  assert.equal(source.getSnapshot().available,true);
});

test("Plugin owns our tab monitoring; foreground refresh keeps user edits",()=>{
  const root=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
  const index=root("src/index.tsx");
  const dashboard=root("src/Dashboard.tsx");
  const auto=root("src/autoTabSource.ts");
  assert.match(index,/startAutoTabSource\(\)/);
  assert.match(index,/stopAutoTabSource\(\)/);
  assert.match(dashboard,/subscribeAutoTabs\(setTabInfo\)/);
  assert.match(dashboard,/setTabInfo\(getAutoTabs\(\)\)/);
  assert.doesNotMatch(dashboard,/loadSteamTabs\(getActiveUserId\(\)\)/);
  assert.match(dashboard,/visibleLibraryTabs\(tabInfo.tabs/);
  assert.match(dashboard,/setGames\(getLibraryGames\(\)\)/);
  assert.match(auto,/POLL_MS=4000/);
  assert.match(auto,/get_library_tabs/);
  assert.match(auto,/save_library_tabs/);
  assert.doesNotMatch(auto,/loadSteamTabs|TabMaster|Unifideck/);
  for(const target of [
    'window.addEventListener("focus",onWake)',
    'window.addEventListener("pageshow",onWake)',
    'document.addEventListener("focusin",onWake)',
    'document.addEventListener("visibilitychange",onVisible)',
    'window.removeEventListener("focus",onWake)',
    'document.removeEventListener("focusin",onWake)',
  ])assert.ok(auto.includes(target),"Missing lifecycle listener "+target);
  assert.match(auto,/window\.setTimeout\(\(\)=>\{/);
  assert.match(auto,/sync\.refresh\(\)/);
});
