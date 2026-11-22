import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {directionalNeighbor} from "../src/spatialFocus.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const source=read("src/SteamGameDetails.tsx");
const dashboard=read("src/Dashboard.tsx");
const css=read("src/theme.ts");
const backend=read("hltb.py");

test("custom Steam Details is independent of original native route and uses shared Midnight vars",()=>{
  assert.match(dashboard,/import \{SteamGameDetails\} from "\.\/SteamGameDetails"/);
  assert.match(dashboard,/steamDetailsGame\s*\? <SteamGameDetails key=\{steamDetailsGame\.id\}/);
  assert.match(dashboard,/setSteamDetailsGame\(game\)/);
  assert.match(dashboard,/onOpenGame=\{game=>openGameDetails\(game\)\}/);
  assert.match(dashboard,/onBack=\{closeSteamDetails\}/);
  assert.match(css,/\.gl-root \.gl-game-details/);
  assert.match(css,/\.gl-root \.gl-main\.gl-main-details/);
  assert.match(css,/var\(--gl-bg\)|var\(--gl-text\)|var\(--gl-muted\)/);
  assert.doesNotMatch(source,/COMPACT_DETAILS_INSTALL_SCRIPT|routerHook\.addPatch|document\.querySelector\(\x27\.BasicUI/);
});

test("matches reference components: hero, portrait, game metadata, HLTB, actions, native function fallback",()=>{
  for(const match of [
    /<HeroBackdrop/,/<GameLogo/,/<DetailPoster/,/<ProtonDBBadge/,
    /gl-details-hltb/,/gl-details-action-row/,/gl-details-hero/,
    /gl-details-tabs/,/gl-details-panel/,/gl-details-context/,
    /<SystemStatusBar/,/onNativeDetails/,/play\(\{\.\.\.game,installed:true\}\)/,
    /getLibraryGames\(\)/,/requestNativeRequiredInstallBytes/
  ])assert.match(source,match);
  assert.match(source,/Install opens Steam's original installer/);
  assert.match(source,/onActivate=\{action\}/);
  assert.doesNotMatch(source,/SteamClient\.Apps\.InstallApp\(/,
    "Never bypass Steam's install-disk and entitlement prompts with an unverified API.");
});

test("HLTB uses only real three provider times; fourth metric is authentic personal playtime",()=>{
  assert.match(backend,/"main": main, "extras": extras, "completionist": complete/);
  assert.match(source,/requestHltbTimes\(game\.id,game\.title\)/);
  assert.match(source,/hours\(hltbData\?\.main\)/);
  assert.match(source,/hours\(hltbData\?\.extras\)/);
  assert.match(source,/hours\(hltbData\?\.completionist\)/);
  assert.match(source,/playtimeLabel\(playtime\)/);
  assert.match(source,/YOUR PLAYTIME/);
  assert.doesNotMatch(source,/hltbData\?\.all[_-]?styles/i);
});

test("all 4 directional gamepad buttons use Steam focusables and bounded spatial navigation",()=>{
  assert.match(source,/GamepadButton\.DIR_UP/);
  assert.match(source,/GamepadButton\.DIR_DOWN/);
  assert.match(source,/GamepadButton\.DIR_LEFT/);
  assert.match(source,/GamepadButton\.DIR_RIGHT/);
  assert.match(source,/nextGamepadControl\(rootRef\.current,current,direction/);
  assert.match(source,/focusNativeMenuControl\(next,event\.detail!\.button!\)/);
  assert.match(source,/focusNativeMenuControl\(target,GamepadButton\.DIR_DOWN\)/);
  assert.match(source,/onCancelButton:onBack/);
  assert.match(source,/focusRefs/);
  assert.match(source,/onActivate=\{onBack\}/);
  assert.match(source,/onCancelButton:onBack/);
  assert.match(source,/onFocusRail\(\)/);
  assert.match(css,/\.gl-details-focus:is\(\.gl-focused/);
});

test("native four-way layout logic selects physically adjacent controls, not random DOM order",()=>{
  const r=[
    {left:10,right:100,top:20,bottom:60},     // back
    {left:100,right:250,top:110,bottom:150},  // play
    {left:270,right:395,top:110,bottom:150},  // details
    {left:100,right:250,top:210,bottom:250},  // activity tab
  ];
  assert.equal(directionalNeighbor(r,1,"right"),2);
  assert.equal(directionalNeighbor(r,2,"left"),1);
  assert.equal(directionalNeighbor(r,1,"down"),3);
  assert.equal(directionalNeighbor(r,3,"up"),1);
});

test("activity/community never fabricate posts or installation state",()=>{
  assert.match(source,/Steam Activity/);
  assert.match(source,/News, posts and friends' activity remain available in Steam/);
  assert.match(source,/lastPlayedLabel\(lastPlayed\)/);
  assert.match(source,/setInstallState\(v=>v===current\.installed/);
  assert.match(source,/Navigation\.NavigateToSteamWeb\(/);
  assert.doesNotMatch(source,/202[45] Update|Say something about this game|Update 2\.2/);
});

test("Library uses native Steam focus bridge while custom Details is visible, never hidden grid",()=>{
  const menu=read("src/nativeMenuGamepad.ts");
  assert.match(menu,/details:"\.gl-game-details \.gl-details-focus"/);
  assert.match(dashboard,/useNativeMenuGamepad\(steamDetailsGame\?"details":nativeMenuKind,nativeMenuRoot\)/);
  assert.match(source,/onActivate=\{onBack\}/);
  assert.match(source,/onCancelButton:onBack/);
  assert.doesNotMatch(source,/focusSpatially\(/);
});

test("Details return keeps same Library/Collections/Home route, game, scroll and original action",()=>{
  assert.match(dashboard,/steamReturnTarget=useRef/);
  assert.match(dashboard,/scrollTop:fullGridScrollRef\.current\?\.scrollTop\?\?0/);
  assert.match(dashboard,/kind:collectionsMode\?"collections":viewAll\|\|searchMode\?"grid"/);
  assert.match(dashboard,/clickedHomeDetails\?"home-action":"home-card"/);
  assert.match(dashboard,/setSteamDetailsGame\(null\)/);
  assert.match(dashboard,/fullGridScrollRef\.current\.scrollTop=snapshot\.scrollTop/);
  assert.match(dashboard,/focusNativeMenuControl\(target,GamepadButton\.DIR_DOWN\)/);
  assert.match(dashboard,/if\(snapshot\.kind==="collections"\)/);
  assert.match(dashboard,/if\(\+\+attempts>10\)/);
});

test("controller icon invokes direct Steam Input configurator, not original game Settings",()=>{
  const core=read("src/steamControllerEditorCore.ts");
  const adapter=read("src/steamControllerEditor.ts");
  assert.match(core,/controllerconfigurator\/main/);
  assert.match(adapter,/Navigation\.Navigate\(route\)/);
  assert.match(source,/openSteamControllerEditor\(game\.id\)/);
  const controllerAction=source.slice(source.indexOf("const openController="),
    source.indexOf("const action=",source.indexOf("const openController=")));
  assert.doesNotMatch(controllerAction,/onNativeDetails\(\)/);
});

test("gear and physical Start share the exact native Steam game menu, not Settings page",()=>{
  const menu=read("src/nativeGameContextMenu.tsx");
  const card=read("src/Dashboard.tsx");
  assert.match(menu,/export function showNativeGameOptions\(gameId:number,anchor:EventTarget\|null\)/);
  assert.match(card,/showNativeGameOptions\(game\.id,e\.currentTarget\)/);
  assert.match(source,/import \{showNativeGameOptions\} from "\.\/nativeGameContextMenu"/);
  assert.match(source,/const openGameOptions=\(\)=>\{/);
  assert.match(source,/showNativeGameOptions\(game\.id,anchor\)/);
  assert.match(source,/onActivate=\{openGameOptions\}/);
  assert.match(source,/onMenuButton=\{\(e:GamepadEvent\)=>\{/);
  assert.match(source,/onMenuActionDescription="Game options"/);
  const gear=source.slice(source.indexOf('title="Steam game options (same as Start)"'),
    source.indexOf("<MdSettings/>"));
  assert.doesNotMatch(gear,/onActivate=\{onNativeDetails\}/);
});

test("controller icon targets pre-edit Controller Settings rather than Edit Layout",()=>{
  const adapter=read("src/steamControllerEditor.ts");
  const core=read("src/steamControllerEditorCore.ts");
  assert.match(adapter,/Navigation\.Navigate\(route\)/);
  assert.match(core,/controllerconfigurator\/main/);
  assert.doesNotMatch(adapter,/steam:\/\/controllerconfig|ShowControllerConfigurator/);
  const controllerAction=source.slice(source.indexOf("const openController="),source.indexOf("const action="));
  assert.match(controllerAction,/openSteamControllerEditor\(game\.id\)/);
  assert.doesNotMatch(controllerAction,/showNativeGameOptions\(|onNativeDetails\(/);
  const gear=source.slice(source.indexOf("const openGameOptions="),source.indexOf("const openController="));
  assert.match(gear,/showNativeGameOptions\(game\.id,anchor\)/);
});
