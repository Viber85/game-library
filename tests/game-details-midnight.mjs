import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {expandThemeClassAliases} from "../src/themeClassAliases.ts";

const read=(file)=>readFileSync(new URL("../"+file,import.meta.url),"utf8");
const source=read("system-theme/game-details-midnight.css");
const clean=source.replace(/\/\*[\s\S]*?\*\//g,"");
const backend=read("main.py");
const compiler=read("src/themeCssCompiler.ts");

test("0.5.4 Midnight game page uses verified Steam CSS module keys",()=>{
  // Keys checked against SteamDeckHomebrew/decky-frontend-lib static-classes.ts,
  // native DeckThemes/Clean Gameview, and AikoMidori/steam-library GamePage.css.
  for(const name of [
    "sharedappdetailsheader_TopGradient",
    "sharedappdetailsheader_TitleSection",
    "basicappdetailssectionstyler_PlaySection",
    "appdetailsplaysection_PlayBar",
    "appdetailsplaysection_CloudStatusRow",
    "appdetailsplaysection_MenuButton",
    "appactionbutton_Green",
    "appactionbutton_ButtonChild",
    "appdetailssection_AppDetailsSectionContainer",
    "appdetailsactivitysection_ActivityFeedContainer",
    "appdetailscommunityfeed_CommunityItem",
    "appactivityday_Event",
    "posttextentry_PostTextEntryArea",
  ])assert.ok(source.includes(name),name+" must be native or verified Steam class");
  assert.match(compiler,/sharedappdetailsheader:\["TopCapsule","HeaderBackgroundImage"\]/);
  assert.match(compiler,/posttextentry:\["PostTextEntry","PostTextEntryArea"\]/);
});

test("Scoping keeps Steam artwork, root overlays and controller input native",()=>{
  assert.doesNotMatch(clean,/#GamepadUI_Full_Root\s*\{|(?:^|\n)\s*:root\s*\{/);
  assert.doesNotMatch(clean,/(?:^|,|\s)(?:img|video|svg|canvas)\s*(?:\{|:|\[)/);
  assert.doesNotMatch(clean,/HeaderBackgroundImage[^\n]*\s*\{|ImgContainer[^\n]*\s*\{/);
  assert.doesNotMatch(clean,/\b(?:display|position|width|height|overflow|transform|pointer-events|z-index)\s*:/);
  assert.doesNotMatch(clean,/https?:\/\/|url\(|content\s*:/,
    "Never insert fake game artwork, icons, logos, copy or content");
  assert.doesNotMatch(clean,/filter\s*:\s*brightness|(?:^|;)\s*opacity\s*:/);
  for(const block of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const selector=block[1].trim();
    assert.ok(selector.includes(".BasicUI"),
      "New details CSS must be scoped to native Game Mode");
  }
});

test("Specific styling matches accepted Midnight focus without whole page ring",()=>{
  assert.ok(clean.includes("outline:2px solid #63cfff !important"));
  assert.ok(clean.includes("0 0 20px rgba(3,206,255,.74)"));
  assert.ok(clean.includes("#020815"));
  assert.ok(clean.includes("#163a5e"));
  assert.doesNotMatch(clean,/\.BasicUI\s*:\s*is\([^)]*\)\s*\{\s*box-shadow/,
    "No cyan outline around the entire game details page");
});

test("HLTB info styles target genuine HLTB for Deck markup and never hardcode stats",()=>{
  // Verified against morwy/hltb-for-deck src/components/GameStats/GameStats.tsx.
  for(const selector of [
    "#hltb-for-deck", ".hltb-info", ".hltb-gametime",
    ".hltb-label", ".hltb-details-btn"
  ])assert.ok(clean.includes(selector));
  assert.doesNotMatch(clean,/2\.1 hours|2\.5 hours|2\.9 hours|Edith Finch|Death_Panda/,
    "Game-specific demonstration values must never appear in plugin CSS");
});

test("New CSS is appended after older game-details rules only in main Game Mode",()=>{
  const main=backend.slice(backend.indexOf('"main": ('),backend.indexOf('"overlay": ('));
  const overlay=backend.slice(backend.indexOf('"overlay": ('));
  assert.ok(main.indexOf('"game-details-midnight.css"') >
    main.indexOf('"game-details-extras.css"'));
  assert.ok(main.includes('"game-details.css"'));
  assert.ok(!overlay.includes('"game-details-midnight.css"'),
    "Do not leak game detail fills into Quick Access overlay or notifications");
});

test("Native game-details selectors resolve to live Steam webpack aliases",()=>{
  const input='.BasicUI [class*="sharedappdetailsheader_TopGradient"],' +
    '.BasicUI [class*="appdetailsplaysection_PlayBar"] {background:#071c32;}';
  const expanded=expandThemeClassAliases(input,{
    sharedappdetailsheader:{TopGradient:"_nativeHeaderGradHash"},
    appdetailsplaysection:{PlayBar:"_nativePlayBarHash"},
  });
  assert.ok(expanded.includes('[class~="_nativeHeaderGradHash"]'));
  assert.ok(expanded.includes('[class~="_nativePlayBarHash"]'));
  assert.ok(expanded.includes('[class*="sharedappdetailsheader_TopGradient"]'));
  assert.ok(expanded.includes('[class*="appdetailsplaysection_PlayBar"]'));
});
