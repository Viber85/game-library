import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {readRunningGame,resumeRunningGame} from "../src/runningGame.ts";

const read=(file)=>readFileSync(new URL("../"+file,import.meta.url),"utf8");
const state=(appid,display_name,status=4)=>({
  appid,display_name,local_per_client_data:{display_status:status},
});

test("Steam game appears only when SteamUIStore actually reports it running",()=>{
  const current=readRunningGame({
    RunningApps:[state(1091500,"Cyberpunk 2077")],
    MainRunningAppID:1091500,
  },null);
  assert.deepEqual(current,{id:1091500,title:"Cyberpunk 2077"});
  assert.equal(readRunningGame({RunningApps:[],MainRunningAppID:1091500},null),null,
    "MainRunningAppID by itself must not invent a running game");
  assert.equal(readRunningGame(undefined,null),null);
  assert.equal(readRunningGame({RunningApps:[state(101,"Launching",1)]},null),null);
  assert.equal(readRunningGame({RunningApps:[state(102,"Stopping",36)]},null),null);
  assert.deepEqual(readRunningGame({RunningApps:[{appid:103,display_name:"No status"}]},null),
    {id:103,title:"No status"});
});

test("non-Steam shortcuts are detected using their canonical unsigned appid",()=>{
  const shortcut=0xe345b69a;
  const signed=shortcut|0;
  const store={
    RunningApps:[state(signed,"Clair Obscur: Expedition 33")],
    MainRunningAppID:signed,
  };
  const current=readRunningGame(store,{});
  assert.deepEqual(current,{id:shortcut,title:"Clair Obscur: Expedition 33"});
  assert.ok(current.id>=0x80000000,"Non-Steam appid stays in shortcut range");
  let selected=null,navigations=0,launches=0;
  store.SetRunningApp=id=>{selected=id;};
  store.NavigateToRunningApp=()=>{navigations++;};
  store.RunGame=()=>{launches++;};
  assert.equal(resumeRunningGame(current,store),true);
  assert.equal(selected,shortcut);
  assert.equal(navigations,1);
  assert.equal(launches,0,"Returning to a Non-Steam game must never call RunGame");
});

test("main running app wins even when another game appears earlier in RunningApps",()=>{
  const store={
    RunningApps:[state(10,"Older"),state(20,"Newer")],
    MainRunningAppID:20,
  };
  assert.deepEqual(readRunningGame(store,null),{id:20,title:"Newer"});
});

test("non-Steam name falls back to appStore; no game library or launch required",()=>{
  const shortcut=0xa9876543;
  const game=readRunningGame(
    {RunningApps:[{appid:shortcut}]},
    {GetAppOverviewByAppID:()=>({display_name:"My GOG Game"})},
  );
  assert.deepEqual(game,{id:shortcut,title:"My GOG Game"});
  const fallback=readRunningGame(
    {RunningApps:[{appid:shortcut}]},
    {m_mapApps:new Map([[shortcut|0,{display_name:"Epic shortcut"}]])},
  );
  assert.equal(fallback.title,"Epic shortcut");
});

test("stale icon never starts another Steam or non-Steam process",()=>{
  const shortcut=0xffabcdef;
  let calls=0;
  const store={
    RunningApps:[state(1,"Other game")],
    SetRunningApp:()=>calls++,
    NavigateToRunningApp:()=>calls++,
    RunGame:()=>calls++,
  };
  assert.equal(resumeRunningGame({id:shortcut,title:"Old shortcut"},store),false);
  assert.equal(calls,0);
  assert.equal(resumeRunningGame({id:1,title:"Other game"},null),false);
  assert.equal(calls,0);
});

test("safe return route is used only after Steam successfully selects the running game",()=>{
  let chosen=0,back=0;
  const store={RunningApps:[state(50,"Running")],
    SetRunningApp(id){chosen=id;}};
  assert.equal(resumeRunningGame({id:50,title:"Running"},store,()=>back++),true);
  assert.equal(chosen,50);
  assert.equal(back,1);
  const fail={RunningApps:[state(50,"Running")],
    SetRunningApp(){throw new Error("unavailable")}};
  const warn=console.warn;console.warn=()=>{};
  try{assert.equal(resumeRunningGame({id:50,title:"Running"},fail,()=>back++),false);}
  finally{console.warn=warn;}
  assert.equal(back,1,"No navigation when Steam failed to select the app");
});

test("sidebar running icon is dynamic, at the top, and controller-focusable",()=>{
  const ui=read("src/Dashboard.tsx"),css=read("src/theme.ts");
  const visuals=read("src/RunningGameVisuals.tsx"),hook=read("src/useRunningGameState.ts");
  const startup=ui.indexOf('...(runningGame ? [{');
  const home=ui.indexOf('{ id: "home"');
  assert.ok(startup>0&&startup<home,"Running action must precede Home");
  assert.match(hook,/readRunningGame\(\(window as any\)\.SteamUIStore/);
  assert.match(ui,/resumeRunningGame\(runningGame,\(window as any\)\.SteamUIStore/);
  assert.match(hook,/1600/);
  assert.match(ui,/focusClassName="gl-focused"/);
  assert.match(ui,/lastRailId\.current=railActions\[target\]\.id/);
  assert.match(ui,/lastRailId\.current=action\.id/);
  assert.match(ui,/gl-running-indicator/);
  assert.match(ui,/RunningGameIcon.*game=\{games\.find\(g=>g\.id===runningGame\?\.id\)\}/);
  assert.match(visuals,/posterCandidates\(game\)/);
  assert.doesNotMatch(ui,/requestSteamLaunch\(runningGame|play\(runningGame|RunGame\(runningGame/,
    "Return must never launch an existing app");
  assert.match(css,/gl-running-title-news/);
  assert.match(css,/overflow:hidden/);
  assert.match(css,/\.gl-root\.gl-nav-expanded \.gl-running-title\.gl-marquee-active/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(visuals,/pixels>3\?pixels:0/,"Marquee must only run when text is too wide");
  assert.match(visuals,/resize\?\.disconnect\(\)/);
});
