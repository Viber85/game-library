import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const ui=read("src/Dashboard.tsx");
const badge=read("src/SteamInstallSizeBadge.tsx");
const css=read("src/theme.ts");
const native=read("src/nativeSortFields.ts");
const back=read("main.py");
const service=read("steam_size.py");
const packageScript=read("scripts/package.sh");

test("Existing native Steam size_on_disk remains authoritative for installed games",()=>{
  assert.match(native,/sizeBytes:safeNonnegative\(o\.size_on_disk\)/);
  assert.match(badge,/const native=game\.installed&&typeof game\.sizeBytes==="number"/);
  assert.match(badge,/nativeGb!==null\?"SIZE":estimate\?"EST\.":"SIZE"/);
  assert.match(badge,/Installed size · Steam local size_on_disk/);
  assert.match(badge,/not an exact download or installed size/);
  assert.match(badge,/if\(game\.nonSteam\)return null/);
  assert.doesNotMatch(badge,/steam:\/\/install|Navigation\.Navigate|RequestAppDetails/);
});

test("Only dedicated Library grid shows size badge and does not prefetch 400 games",()=>{
  assert.match(ui,/showInstallSize=\{initialMode==="library"\}/);
  assert.match(ui,/selectedForSize=\{selectedId===game\.id\}/);
  assert.match(ui,/showInstallSize&&<SteamInstallSizeBadge/);
  assert.match(ui,/data-size-active=\{showInstallSize\|\|undefined\}/);
  assert.match(badge,/if\(!game\.nonSteam&&active&&native===null\)/);
  assert.match(badge,/timer=window\.setTimeout\(load,850\)/);
  assert.match(badge,/if\(reply\.status==="deferred"&&attempts<3\)/);
  assert.match(badge,/return \(\)=>\{mounted=false;if\(timer!==undefined\)window\.clearTimeout\(timer\);\}/);
  assert.match(badge,/const pending=new Map<number,Promise<StoreSizeReply>>\(\)/);
  assert.match(css,/\.gl-root \.gl-full-grid \.gl-poster\[data-size-active="true"\]/);
  assert.match(css,/\.gl-root \.gl-full-grid \.gl-poster-size/);
  assert.doesNotMatch(css,/\.gl-root \.gl-strip \.gl-poster-size/);
});

test("Steam Store backend has strictly bounded requirements and never reads user credentials",()=>{
  assert.match(back,/async def steam_install_size\(self, appid: int\)/);
  assert.match(back,/async def steam_size_cached_bulk\(self, appids: list\)/);
  assert.match(service,/https:\/\/store\.steampowered\.com\/api\/appdetails\?/);
  assert.match(service,/appids=\{appid\}&filters=basic&l=english&cc=us/);
  assert.match(service,/MIN_REQUEST_INTERVAL = 3\.0/);
  assert.match(service,/POSITIVE_TTL = 30 \* 86400/);
  assert.match(service,/NEGATIVE_TTL = 24 \* 3600/);
  assert.match(service,/MAX_BYTES = 2_000_000/);
  assert.match(service,/if error\.code in \(429, 403\):/);
  assert.match(service,/self\.next_allowed = time\.monotonic\(\) \+ cooldown/);
  assert.match(service,/if type\(appid\) is not int or not 1 <= appid <= 0xFFFFFFFF/);
  assert.match(service,/return \{"status": "deferred", "retry_after":/);
  assert.doesNotMatch(service,/Authorization|Bearer|Cookie|steamcmd|depotcache/);
  assert.match(packageScript,/cp plugin\.json main\.py updates\.py hltb\.py protondb\.py steamgriddb\.py steam_size\.py/);
  assert.match(packageScript,/game-library\/steam_size\.py/);
});

test("Steam Store fallback is explicitly estimated and not used as actual size sort",()=>{
  assert.match(service,/parse_required_gb\(req\.get\(category\)\)/);
  assert.match(service,/for category in \("minimum", "recommended"\)/);
  assert.match(service,/for platform in \("pc", "linux"\)/);
  assert.match(service,/status": "estimated"/);
  assert.match(badge,/estimate\?"~"\+formatted:"—"/);
  assert.match(read("src/homeSort.ts"),/sizeBytes/);
  assert.doesNotMatch(read("src/homeSort.ts"),/estimated_gb/);
  assert.match(read("src/Dashboard.tsx"),/onMove=\{button=>moveInGrid\(index,button\)\}/);
  assert.match(read("src/Dashboard.tsx"),/libraryAlphabetActive&&<LibraryAlphabetIndicator/);
});
