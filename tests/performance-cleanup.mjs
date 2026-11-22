import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {sameLibraryGames,libraryTabSignature} from "../src/librarySnapshot.ts";
import {requestSelectedGameDetails} from "../src/selectedGameDetails.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const game=(id=1)=>({
  id,title:"Game",installed:true,favorite:false,nonSteam:false,
  lastPlayed:456,playtimeMinutes:100,playtimeKnown:true,
  addedAt:123,releaseDate:234,sizeBytes:123456,
  achievementsUnlocked:4,achievementsTotal:10,
  poster:"https://example.com/cover.jpg",
  hero:"https://example.com/hero.jpg",
});

test("Unchanged Steam CAppOverview snapshots keep React state reference stable",()=>{
  const before=[game(1),game(2)];
  const after=[{...game(1)},{...game(2)}];
  assert.equal(sameLibraryGames(before,before),true);
  assert.equal(sameLibraryGames(before,after),true);
  assert.equal(sameLibraryGames(before,after.slice(0,1)),false);
  assert.equal(sameLibraryGames(before,[after[1],after[0]]),false);
});

test("Every meaningful native game property invalidates the snapshot",()=>{
  const first=game(1);
  const fields={
    title:"Changed",installed:false,favorite:true,nonSteam:true,
    lastPlayed:457,playtimeMinutes:101,playtimeKnown:false,
    addedAt:124,releaseDate:235,sizeBytes:123457,
    achievementsUnlocked:5,achievementsTotal:11,
    poster:"https://example.com/new.jpg",hero:undefined,
  };
  for(const [key,value] of Object.entries(fields)){
    assert.equal(sameLibraryGames([first],[{...first,[key]:value}]),false,
      "Changed native field was ignored: "+key);
  }
});

test("Custom collection membership updates even with unchanged game overviews",()=>{
  const games=[game(1),game(2),game(3)];
  const tabs=[{id:"Steam"},{id:"Epic"},{id:"GOG"}];
  const memberships=new Map([
    ["Steam",new Set([1,2,3])],
    ["Epic",new Set([1])],
    ["GOG",new Set([2])],
  ]);
  const resolve=(tab,items)=>({
    supported:true,games:items.filter(g=>memberships.get(tab.id).has(g.id))
  });
  const baseline=libraryTabSignature(tabs,games,resolve);
  assert.equal(libraryTabSignature(tabs,[...games],resolve),baseline);
  memberships.get("Epic").add(3);
  assert.notEqual(libraryTabSignature(tabs,games,resolve),baseline,
    "Unifideck/TabMaster membership must not get stuck due to snapshot equality");
  memberships.get("Epic").delete(3);
  assert.equal(libraryTabSignature(tabs,games,resolve),baseline);
  assert.notEqual(libraryTabSignature(tabs.slice(0,2),games,resolve),baseline);
});

test("Steam logo and hero share exactly ONE pending RequestAppDetails call",async()=>{
  let count=0;
  let complete=()=>{};
  globalThis.window={appDetailsStore:{
    RequestAppDetails(id){
      assert.equal(id,620);
      count++;
      return new Promise(resolve=>{complete=resolve;});
    }
  }};
  const hero=requestSelectedGameDetails(620);
  const logo=requestSelectedGameDetails(620);
  assert.strictEqual(hero,logo,"Two components should share an in-flight promise");
  await Promise.resolve();
  assert.equal(count,1);
  complete();
  assert.deepEqual(await Promise.all([hero,logo]),[true,true]);
  await Promise.resolve();
  globalThis.window.appDetailsStore.RequestAppDetails=()=>{count++;return Promise.resolve();};
  assert.equal(await requestSelectedGameDetails(620),true);
  assert.equal(count,2,"A later selection must request updated Steam artwork");
});

test("Steam artwork helper fails closed on absent API, invalid IDs and rejections",async()=>{
  globalThis.window={appDetailsStore:{
    RequestAppDetails(){throw new Error("Steam details unavailable");}
  }};
  assert.equal(await requestSelectedGameDetails(42),false);
  assert.equal(await requestSelectedGameDetails(-1),false);
  assert.equal(await requestSelectedGameDetails(0),false);
  assert.equal(await requestSelectedGameDetails(2**32),false);
  globalThis.window={};
  assert.equal(await requestSelectedGameDetails(620),false);
});

test("Dashboard no longer causes two identical native app-details calls",()=>{
  const s=read("src/Dashboard.tsx"),artwork=read("src/SelectedGameArtwork.tsx");
  assert.equal((artwork.match(/requestSelectedGameDetails\(game\.id\)/g)||[]).length,2);
  assert.doesNotMatch(s,/\.RequestAppDetails\(game\.id\)/);
  assert.match(s,/sameLibraryGames\(previous,next\)\?previous:next/);
  assert.match(s,/membershipSignature\.current!==signature/);
  assert.match(s,/libraryTabSignature\(tabs,games,createLibraryTabResolver\(\)\)/);
  assert.match(s,/membershipRevision/);
  assert.match(s,/\[tabs, games, membershipRevision\]/);
  assert.match(s,/\[searchMode,searchResults,tab,games,membershipRevision\]/);
  assert.match(s,/showNativeGameOptions\(game\.id,e\.currentTarget\)/);
  assert.match(s,/return startSortMetadata/);
});

test("Dead helper exports are gone, real SteamGridDB image fallbacks remain",()=>{
  const source=read("src/steam.ts");
  assert.doesNotMatch(source,/export function posterUrl\(/);
  assert.doesNotMatch(source,/export function heroUrl\(/);
  assert.match(source,/export function posterCandidates\(/);
  assert.match(source,/export function heroCandidates\(/);
  assert.match(source,/export function heroFallbackCandidates\(/);
  assert.match(source,/export function logoCandidates\(/);
  const panel=read("src/SteamGridDBPanel.tsx");
  assert.match(panel,/Auto-fill missing Steam and GOG artwork/);
});

test("Midnight native CSS and current controller/theme behavior remain untouched",()=>{
  const dash=read("src/Dashboard.tsx"),css=read("src/theme.ts");
  assert.match(dash,/onOptionsButton=\{\(e:GamepadEvent\)=>\{consume\(e\);onSort\(\);\}\}/);
  assert.match(dash,/onMenuButton=\{\(e:GamepadEvent\)=>\{/);
  assert.match(css,/--gl-blue:#4fc3ff/);
  assert.match(read("system-theme/shared.css"),/--glm-accent: #4ac1ff/);
  assert.match(read("system-theme/shared.css"),/--glm-panel: #0c1b32/);
});
