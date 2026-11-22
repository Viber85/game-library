import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {steamStorePageUrl,validHltbGameUrl} from "../src/gameDetailsLinks.ts";
import {
  armGameDetailsWebReturn,consumeControllerSettingsReturn,
  clearControllerSettingsReturn
} from "../src/controllerSettingsReturn.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const source=read("src/SteamGameDetails.tsx");
const dashboard=read("src/Dashboard.tsx");

test.afterEach(()=>clearControllerSettingsReturn());

test("HLTB only opens real game pages, not arbitrary navigation or invented IDs",()=>{
  assert.equal(validHltbGameUrl("https://howlongtobeat.com/game/1091500"),true);
  for(const url of [
    "https://fake.howlongtobeat.com/game/55",
    "https://howlongtobeat.com/",
    "http://howlongtobeat.com/game/55",
    "https://howlongtobeat.com/game/55?next=https://evil.test",
    "https://howlongtobeat.com/game/55#fragment",
    "javascript:alert(1)"
  ])assert.equal(validHltbGameUrl(url),false,url);
});

test("Steam Store button uses the HTTPS store page for ExternalWeb return-path experiment",()=>{
  assert.equal(steamStorePageUrl(1091500,false),"https://store.steampowered.com/app/1091500");
  assert.equal(steamStorePageUrl(730,false),"https://store.steampowered.com/app/730");
  for(const appId of [0,-1,NaN,Infinity,1.5,0x80000000,2**32])
    assert.equal(steamStorePageUrl(appId,false),null);
  assert.equal(steamStorePageUrl(1091500,true),null);
  assert.match(source,/onActivate=\{isNativeSteam\?onOpenStore:onNativeDetails\}/);
  assert.match(source,/isNativeSteam\?"Steam Store":"Steam Details"/);
  assert.doesNotMatch(dashboard,/Navigation\.NavigateToSteamWeb\(url\)/);
  assert.match(dashboard,/Navigation\.NavigateToExternalWeb\(url\)/);
  assert.match(dashboard,/steamStorePageUrl\(game\.id,game\.nonSteam\)===url/);
});

test("HLTB uses external browser, not SteamWeb gamepad history which replayed controller options",()=>{
  assert.match(source,/onActivate=\{\(\)=>onOpenHltb\(hltbLink\)\}/);
  assert.match(dashboard,/Navigation\.NavigateToExternalWeb\(url\)/);
  assert.match(dashboard,/armGameDetailsWebReturn\(\{route:actualRoute,appId:game\.id,target\}\)/);
  assert.match(dashboard,/rememberGameDetails\(game\);\s*try\{/);
  assert.match(dashboard,/onOpenHltb=\{url=>openGameDetailsWeb\(steamDetailsGame,"hltb",url\)\}/);
  const childHltb=source.slice(source.indexOf("{hltbLink&&"),source.indexOf("</Focusable>}",source.indexOf("{hltbLink&&")));
  assert.doesNotMatch(childHltb,/NavigateToSteamWeb|onNativeDetails/);
});

test("HLTB B restores the same custom Game Details by consuming one route-scoped token",()=>{
  const target={kind:"grid",gameId:1091500,index:45,scrollTop:700};
  const state={route:"/game-library/library",appId:1091500,target};
  assert.equal(armGameDetailsWebReturn(state,1000),true);
  assert.equal(consumeControllerSettingsReturn("/game-library/dashboard",1100),null);
  assert.deepEqual(consumeControllerSettingsReturn("/game-library/library",1300),state);
  assert.equal(consumeControllerSettingsReturn("/game-library/library",1400),null);
  assert.match(dashboard,/consumeControllerSettingsReturn\(actualRoute\)/);
  assert.match(dashboard,/controllerReturn\?getLibraryGames\(\)\.find\(g=>g\.id===controllerReturn\.appId\)/);
});

test("closing Details clears an unconsumed web token, avoids stale controller menu flash",()=>{
  assert.match(dashboard,/if\(steamDetailsGame\)clearControllerSettingsReturn\(steamDetailsGame\.id\)/);
  assert.match(dashboard,/clearDetailsOrigin\(\);\s*setSteamDetailsGame\(null\)/);
  assert.doesNotMatch(source,/onAction\("original-info"\)/);
  assert.doesNotMatch(source,/Original Steam Details <MdOpenInNew\/>/);
});

test("Game Details metadata replaces the removed Game Info tab",()=>{
  assert.match(source,/gl-details-metrics/);
  assert.match(source,/gl-details-meta-cell/);
  assert.match(source,/lastPlayedLabel\(lastPlayed\)/);
  assert.doesNotMatch(source,/<h2>Game Info<\/h2>|gl-details-tabs|View in Steam/);
});
