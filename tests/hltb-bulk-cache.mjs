import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const source=read("src/sortMetadata.ts");
const ui=read("src/Dashboard.tsx");
const backend=read("main.py");
const python=read("hltb.py");

test("HLTB loads all existing disk cache entries in bulk before sending missing requests",()=>{
  assert.match(source,/callable<\[Array<\{id:number;title:string\}>\],HltbBulkReply>\(\s*"hltb_cached_bulk"\)/);
  assert.match(source,/primeHltbCache\(games,\(\)=>\{/);
  assert.match(source,/await primeHltbCache\(/);
  assert.match(source,/const todo=games\.filter\(g=>eligible\(g\)&&/);
  assert.match(source,/kind==="hltb"\?!readyHltb\(g\):!map\.has\(g\.id\)/);
  assert.match(source,/const BULK_SIZE=400;/);
  assert.match(source,/h[l]?tbBulk\(chunk\.map\(g=>\(\{id:g\.id,title:g\.title\.trim\(\)\}\)\)\)/);
  assert.match(source,/for\(const entry of response\?\.entries\?\?\[\]\)/);
});

test("Fast disk prewarm happens when the user visits a tab, independent of selecting HLTB sort",()=>{
  const start=ui.indexOf("const metadataQueryIds=");
  const warm=ui.indexOf("void primeHltbCache(",start);
  const network=ui.indexOf("return startSortMetadata(",start);
  assert.ok(start>0&&warm>start&&network>warm);
  const prewarmEnd=ui.indexOf("},[tab.id,metadataQueryIds,tabResult.supported]);",warm);
  const prewarmEffect=ui.slice(start,prewarmEnd);
  assert.ok(prewarmEnd>warm);
  assert.doesNotMatch(prewarmEffect,/if\(!sortKind/);
  assert.match(prewarmEffect,/if\(!tabResult\.supported\|\|!tabResult\.games\.length\)return;/);
  assert.match(prewarmEffect,/if\(mounted&&activeSortKind\.current==="hltb"\)/);
  assert.match(prewarmEffect,/setMetaRevision\(revision=>revision\+1\);/);
});

test("A successful persistent cache entry instantly provides Main + Extras without a remote lookup",()=>{
  assert.match(source,/cached\.hltb\.set\(entry\.id,validHours\(entry\.extras\)\)/);
  assert.match(source,/if\(entry\.fresh&&typeof entry\.expires_in==="number"/);
  assert.match(source,/markHltbReady\(original,entry\.expires_in\)/);
  assert.match(source,/kind==="hltb"\?readyHltb\(g\):map\.has\(g\.id\)/);
  assert.doesNotMatch(source,/result\.data\?\.main\s*\+|completionist\s*\+/);
});

test("Expired cache values remain visible while refresh runs, and fresh misses are skipped",()=>{
  assert.match(source,/else hltbReady\.delete\(entry\.id\); \/\/ stale: keep value, refresh/);
  assert.match(source,/result\.stale===true/);
  assert.match(source,/if\(validHours\(hours\)!==null\)/);
  assert.match(source,/HLTB_RETRY_MS=5\*60_000/);
  assert.match(source,/const count=kind==="hltb"\?1/);
  assert.match(source,/kind==="hltb"\?650:250/);
  assert.match(python,/HIT_TTL = 7 \* 86400/);
  assert.match(python,/MISS_TTL = 12 \* 3600/);
  assert.match(python,/def cached_bulk\(self, games\):/);
  assert.match(python,/fresh = math\.isfinite\(age\) and 0 <= age < ttl/);
  assert.match(python,/old\.get\("query"\) != title/);
  assert.match(python,/"expires_in": max\(0, int\(ttl - age\)\) if fresh else 0/);
});

test("Caching only uses local hltb_cache.json, not extra account or network endpoints",()=>{
  assert.match(backend,/async def hltb_cached_bulk\(self, games: list\):/);
  assert.match(backend,/self\._hltb_cache_service\(\)\.cached_bulk, games/);
  assert.match(backend,/len\(games\) > 1000/);
  const method=python.slice(python.indexOf("def cached_bulk("),python.indexOf("    def lookup(",python.indexOf("def cached_bulk(")));
  assert.doesNotMatch(method,/_search\(|_request\(|urllib|write_text|os\.replace/);
  assert.match(python,/old = self\._cache\.get\(str\(appid\)\)/);
});

test("Other metadata sorting and controls remain unchanged",()=>{
  assert.match(source,/kind==="proton"\?2:3/);
  assert.match(source,/loadAchievements\(g\.id,native\.SteamClient,native\.appDetailsStore\)/);
  assert.match(ui,/showNativeGameOptions\(game\.id,e\.currentTarget\)/);
  assert.match(ui,/onSort=\{showSortMenu\}/);
  assert.match(ui,/consumeDetailsOrigin,peekDetailsOrigin,rememberDetailsOrigin/);
  assert.match(ui,/HOWLONGTOBEAT · MAIN \+ EXTRAS/);
});
