import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import {classifySteamTab,identifySteamTabs,fallbackMainTitlesPresent} from "../src/themeTabs.ts";

test("main Game Mode and Steam overlay windows receive separate styling",()=>{
  assert.deepEqual(classifySteamTab({title:"Steam Big Picture Mode",url:""}),{
    title:"Steam Big Picture Mode",scope:"main"});
  assert.deepEqual(classifySteamTab({title:"QuickAccess-Menu_204",url:""}),{
    title:"QuickAccess-Menu_204",scope:"overlay"});
  assert.deepEqual(classifySteamTab({title:"Steam 大屏幕模式",url:""}),{
    title:"Steam 大屏幕模式",scope:"main"});
  assert.deepEqual(classifySteamTab({title:"MainMenu_602",url:""}),{
    title:"MainMenu_602",scope:"overlay"});
});

test("discover gamepad UI when Steam changes its tab caption",()=>{
  assert.equal(classifySteamTab({title:"Game Mode UI",url:"file:///Valve%20Steam%20Gamepad/default"})?.scope,"main");
  assert.equal(classifySteamTab({
    title:"SP",url:"https://steamloopback.host/routes/library/home"
  })?.scope,"main");
  assert.equal(classifySteamTab({
    title:"SharedJSContext",url:"https://steamloopback.host/index.html"
  })?.scope,"main");
  assert.equal(classifySteamTab({title:"Steam",url:"https://example.com"})?.scope??null,null);
});

test("avoid injecting into Steam store, desktop, browser or other apps",()=>{
  const items=[
    {title:"Steam Big Picture Mode",url:"gamepad"},
    {title:"QuickAccess-Menu",url:""},
    {title:"Google",url:"https://example.com"},
    {title:"Steam Store",url:"https://store.steampowered.com"},
    {title:"QuickAccess-Menu",url:""}
  ];
  assert.deepEqual(identifySteamTabs(items),[
    {title:"Steam Big Picture Mode",scope:"main"},
    {title:"QuickAccess-Menu",scope:"overlay"}
  ]);
  assert.equal(classifySteamTab({title:"",url:""}),null);
  assert.equal(classifySteamTab({title:42,url:""}),null);
});

test("visible gamepad UI is preferred to Steam's offscreen SharedJSContext",()=>{
  const tabs=identifySteamTabs([
    {title:"SP",url:"https://steamloopback.host/index.html"},
    {title:"Steam Big Picture Mode",url:"file:///Valve%20Steam%20Gamepad/default"},
    {title:"MainMenu_uid123",url:""},
  ]);
  assert.deepEqual(tabs.map(t=>t.title),[
    "Steam Big Picture Mode","SP","MainMenu_uid123"
  ]);
});
test("Steam client gamepad URLs are accepted only for known Steam contexts",()=>{
  assert.equal(classifySteamTab({
    title:"Steam",url:"file:///Valve Steam Gamepad/default"
  })?.scope,"main");
  assert.equal(classifySteamTab({
    title:"Example Browser",url:"https://steamloopback.host/routes/library/home"
  }),null);
});

test("opaque native Steam CEF URL remains eligible for live DOM verification",()=>{
  const listed=[
    {title:"Steam Big Picture Mode",url:"file:///Valve%20Steam%20Gamepad/default"},
    {title:"SP",url:"about:blank?main"},
    {title:"Steam",url:"about:blank"},
    {title:"Unrelated Website",url:"https://example.com"},
  ];
  assert.deepEqual(identifySteamTabs(listed),[
    {title:"Steam Big Picture Mode",scope:"main"}
  ]);
  assert.deepEqual(fallbackMainTitlesPresent(listed),[
    "Steam Big Picture Mode","Steam","SP"
  ]);
  assert.deepEqual(fallbackMainTitlesPresent([]),[]);
  assert.deepEqual(fallbackMainTitlesPresent([{title:"Other Game",url:"about:blank"}]),[]);
  // A candidate is NOT a confirmed target until the runtime's live
  // STEAM_PAGE_CHECK_SCRIPT succeeds for its real browser document.
  const runtime=readFileSync(new URL("../src/builtinThemeRuntime.ts",import.meta.url),"utf8");
  assert.match(runtime,/for\(const title of fallbackMainTitlesPresent\(listed\)\)/);
  assert.doesNotMatch(runtime,/if\(checked\.some\(t=>t\.scope==="main"\)\)return checked;/);
  assert.match(runtime,/result\.success&&result\.result===true/);
});
