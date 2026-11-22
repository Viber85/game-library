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
  assert.match(source,/focusSpatially\(rootRef\.current,current,direction,"\.gl-details-focus"\)/);
  assert.match(source,/onCancelButton:onBack/);
  assert.match(source,/focusRefs/);
  assert.match(source,/backRef\.current\?\.focus\(\)/);
  assert.match(source,/onFocusRail\(\)/);
  assert.match(source,/\.gl-details-focus:is\(\.gl-focused/);
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
