import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {openNativeSteamMenu} from "../src/nativeSteamMenu.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const dash=read("src/Dashboard.tsx"),app=read("src/AppearancePage.tsx");
const entry=read("src/index.tsx"),css=read("src/theme.ts");

test("Rail has exactly agreed five entries, with running game first only if active",()=>{
  assert.match(dash,/\.\.\.\(runningGame \? \[\{/);
  const ids=[...dash.matchAll(/\{ id: "(home|library|search|appearance|steam-menu|store|downloads|settings|power)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,["home","library","search","appearance","steam-menu"]);
  assert.match(dash,/id:"running",label:runningGame.title/);
  assert.match(dash,/Navigation\.Navigate\(APPEARANCE_ROUTE\)/);
  assert.match(dash,/\{ id: "search", label: "Search", icon: MdSearch, go: openLocalSearch \}/);
  assert.match(dash,/openNativeSteamMenu\(Navigation\)/);
});

test("Native Steam menu bridge opens native menu without synthesized keypresses",()=>{
  let called=0,receiver=null;
  const navigation={OpenMainMenu(){called++;receiver=this;}};
  assert.equal(openNativeSteamMenu(navigation,{}),true);
  assert.equal(called,1);
  assert.strictEqual(receiver,navigation);
  const candidate={OpenMainMenu(){called++;receiver=this;}};
  assert.equal(openNativeSteamMenu({}, {SteamUIStore:{m_MenuStore:candidate}}),true);
  assert.strictEqual(receiver,candidate);
  assert.equal(openNativeSteamMenu({},{}),false);
  assert.doesNotMatch(read("src/nativeSteamMenu.ts"),/dispatchEvent|KeyboardEvent|RunGame/);
});

test("Appearance is independent in Game Mode and route is released on dismount",()=>{
  assert.match(entry,/routerHook\.addRoute\(APPEARANCE_ROUTE,\s*\(\)=> <Dashboard initialMode="appearance"\/>/);
  assert.match(entry,/routerHook\.removeRoute\(APPEARANCE_ROUTE\)/);
  assert.match(dash,/initialMode==="appearance"\s*\? <AppearancePage/);
  assert.match(dash,/appearanceEntryRef\.current\?\.focus\(\)/);
  assert.match(dash,/focusRail\(railIndex\)/);
  assert.match(app,/onCancelButton=\{onBack\}/);
});

test("Appearance controls show existing live settings in collapsible sections",()=>{
  assert.match(app,/Section="theme"\|"artwork"\|"updates"/);
  assert.match(app,/previous===section\.id\?null:section\.id/);
  assert.match(app,/selectBuiltinTheme\(mode\)/);
  assert.match(app,/subscribeThemeStatus\(setStatus\)/);
  assert.match(app,/SteamGridDBPanel/);
  assert.match(app,/UpdatesPanel/);
  assert.match(app,/Additional themes and Color Editor will be added later/);
  assert.doesNotMatch(app,/setCustomColor|setPrimaryColor|hexColorEditor/);
  assert.match(css,/\.gl-root \.gl-appearance-card-heading\.gl-focused/);
  assert.match(css,/\.gl-root \.gl-appearance-theme-option\.gl-focused/);
});

test("Decky retains enable switches and diagnostics without duplicated theme/tool panels",()=>{
  assert.match(entry,/Use as Steam Home/);
  assert.match(entry,/<BuiltinThemePanel \/>/);
  assert.match(entry,/Inspect Library Sources/);
  assert.doesNotMatch(entry,/<SteamGridDBPanel \/>|<UpdatesPanel \/>|Open Midnight Library/);
});

test("Safety: Home/GameCard D-pad, B return, native CSS and focus remain unchanged",()=>{
  assert.match(dash,/const goToGame = \(index\?: number\) => \{/);
  assert.match(dash,/const moveInGrid = \(index:number, button:GamepadButton\)/);
  assert.match(dash,/showNativeGameOptions\(game\.id,e\.currentTarget\)/);
  assert.match(dash,/onMove=\{button=>moveInGrid\(index,button\)\}/);
  assert.match(dash,/lastRailId\.current=action\.id/);
  assert.match(css,/--gl-blue:#4fc3ff/);
  assert.match(read("system-theme/settings-gamepad-focus.css"),/background:#163a5e !important/);
});
