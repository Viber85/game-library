import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createCollectionLookupBatch} from "../src/collectionLookupBatch.ts";
import {createInflightGate} from "../src/inflightRequests.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("one native or Unifideck read per distinct collection in one tab sweep",()=>{
  const state=new Set([11]);
  let nativeCalls=0,unifiedCalls=0;
  const source={
    native:()=>{nativeCalls++;return new Set(state);},
    unified:()=>{unifiedCalls++;return new Set(state);},
  };
  const first=createCollectionLookupBatch(source);
  const original=first.native("favorite");
  assert.strictEqual(original,first.native("favorite"));
  assert.equal(nativeCalls,1);
  assert.notStrictEqual(first.native("favorite","tag"),original);
  assert.equal(nativeCalls,2);
  assert.strictEqual(first.unified("Epic"),first.unified("Epic"));
  assert.equal(unifiedCalls,1);
  first.unified("GOG");assert.equal(unifiedCalls,2);
  state.add(22);
  const second=createCollectionLookupBatch(source);
  assert.equal(original.has(22),false);
  assert.equal(second.native("favorite").has(22),true);
  assert.equal(second.unified("Epic").has(22),true);
  assert.equal(nativeCalls,3);
  assert.equal(unifiedCalls,3);
});

test("failed native collection reads do not poison later refresh cycles",()=>{
  let loaded=false;
  const source={native:()=>loaded?new Set([3]):null,unified:()=>null};
  const first=createCollectionLookupBatch(source);
  assert.equal(first.native("local-install"),null);
  loaded=true;
  assert.equal(first.native("local-install"),null);
  assert.deepEqual([...createCollectionLookupBatch(source).native("local-install")],[3]);
});

test("identical HLTB/Proton calls are shared only while in-flight",async()=>{
  const shared=createInflightGate();
  let calls=0,finish=()=>{};
  const run=()=>{calls++;return new Promise(resolve=>{finish=()=>resolve(25);});};
  const a=shared(["hltb",10,"Game"],run),b=shared(["hltb",10,"Game"],run);
  assert.strictEqual(a,b);
  await Promise.resolve();
  assert.equal(calls,1);
  finish();
  assert.deepEqual(await Promise.all([a,b]),[25,25]);
  await Promise.resolve();
  assert.equal(await shared(["hltb",10,"Game"],async()=>{calls++;return 30;}),30);
  assert.equal(calls,2);
  assert.deepEqual(await Promise.all([
    shared(["proton",10,"Game",false],async()=>1),
    shared(["proton",10,"Game",true],async()=>2),
    shared(["proton",10,"Other",false],async()=>3),
  ]),[1,2,3]);
});

test("rejected provider requests are evicted for retries",async()=>{
  const shared=createInflightGate();
  let calls=0;
  const a=shared(["proton",2,"Game",false],async()=>{calls++;throw Error("offline");});
  assert.strictEqual(a,shared(["proton",2,"Game",false],async()=>{calls++;return 10;}));
  await assert.rejects(a,/offline/);
  assert.equal(await shared(["proton",2,"Game",false],async()=>{calls++;return 10;}),10);
  assert.equal(calls,2);
});

test("Dashboard resolves all own-tab counts without peer plugin collection calls",()=>{
  const tab=read("src/libraryTabs.ts"),ui=read("src/Dashboard.tsx");
  assert.match(tab,/createLibraryTabResolver\(\)/);
  assert.match(tab,/gamesForLibraryTab\(tab,games\)/);
  assert.match(tab,/case "steam":return !game.nonSteam/);
  assert.match(tab,/case "installed":return game.installed/);
  assert.match(ui,/tabsForRefresh\.current,next,createLibraryTabResolver\(\)\)/);
  assert.match(ui,/libraryTabSignature\(tabs,games,createLibraryTabResolver\(\)\)/);
  assert.match(ui,/const resolve=createLibraryTabResolver\(\)/);
  assert.match(ui,/\[searchMode,searchResults,tab,games,membershipRevision\]/);
});

test("HLTB cache is indexed once per chunk but retains title matching and TTL",()=>{
  const s=read("src/sortMetadata.ts");
  assert.match(s,/const requested=new Map\(chunk\.map\(g=>\[g\.id,g\] as const\)\)/);
  assert.match(s,/requested\.get\(entry\.id\)\?\.title\.trim\(\)!==entry\.title/);
  assert.doesNotMatch(s,/chunk\.find\(/);
  assert.match(s,/markHltbReady\(original,entry\.expires_in\)/);
});

test("metadata cards and sorting call one provider with original delays intact",()=>{
  const h=read("src/HltbCard.tsx"),p=read("src/ProtonDBBadge.tsx");
  const s=read("src/sortMetadata.ts"),r=read("src/metadataRequests.ts");
  assert.match(h,/requestHltbTimes\(game\.id,game\.title\)/);
  assert.match(p,/requestProtonRating\(game\.id,game\.title,game\.nonSteam\)/);
  assert.match(s,/requestHltbTimes\(g\.id,g\.title\)/);
  assert.match(s,/requestProtonRating\(g\.id,g\.title,g\.nonSteam\)/);
  assert.match(r,/\["hltb",id,title\]/);
  assert.match(r,/\["proton",id,title,nonSteam\]/);
  assert.match(h,/\},500\)/);
  assert.match(p,/\},450\)/);
  assert.match(s,/kind==="hltb"\?650:250/);
});
