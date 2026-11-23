import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const ui=read("src/SharedLibraryDetails.tsx");
const installer=read("gog_install.py");
const achievements=read("gog_achievements.py");
const bridge=read("src/gogInstallRequests.ts");
const main=read("main.py");
const gog=read("gog.py");
const pkg=read("scripts/package.sh");

test("GOG required space is requested on opening details, before Install",()=>{
  const effect=ui.slice(ui.indexOf("// Space required and GOG Galaxy achievements"),
    ui.indexOf("// GOG downloads belong to our backend"));
  assert.match(effect,/useEffect\(\(\)=>\{/);
  assert.match(effect,/preflightGogInstall\(gogAccountId,game\.storeId\)/);
  assert.match(effect,/setInstallSize\(result\.size_bytes\?\?null\)/);
  assert.match(effect,/setSizeLoading\(true\)/);
  assert.match(effect,/return \(\)=>\{active=false;\}/);
  assert.match(ui,/sizeLoading\?"Checking…":sizeLabel\(installSize\)/);
  assert.match(ui,/if\(bytes<1024\*\*3\)return Math\.ceil\(bytes\/\(1024\*\*2\)\)\+" MB"/);
  assert.match(installer,/def _size_info\(raw\):/);
  assert.match(installer,/return shared \+ \(language_size/);
});

test("GOG achievements are fetched from the signed-in GOG account, not from Steam",()=>{
  assert.match(ui,/getGogAchievements\(gogAccountId,game\.storeId\)/);
  assert.match(ui,/achievementPercent/);
  assert.match(ui,/achievementLabel/);
  assert.match(ui,/gl-details-achievement-progress-fill/);
  assert.doesNotMatch(ui,/<strong>Unavailable<\/strong>\s*<div className="gl-details-empty-progress"/);
  assert.match(bridge,/gog_achievements_summary/);
  assert.match(main,/async def gog_achievements_summary\(self, account_id: str, product_id: str\):/);
  assert.match(achievements,/installer\._account_and_game\(gog, account, product\)/);
  assert.match(achievements,/gog\._active_session\(account\)/);
  assert.match(achievements,/gameplay\.gog\.com\/clients\//);
  assert.match(gog,/parsed\.hostname not in \("auth\.gog\.com", "embed\.gog\.com", "gameplay\.gog\.com"\)/);
  assert.match(pkg,/cp gog\.py gog_phone\.py qrcodegen\.py gog_install\.py gog_launch\.py gog_proton\.py gog_achievements\.py/);
});

test("unsupported or incomplete achievements never invent a 0/0 completion",()=>{
  assert.match(achievements,/if total == 0:/);
  assert.match(achievements,/return \{"status": "none", "unlocked": 0, "total": 0\}/);
  assert.match(achievements,/len\(items\) != total/);
  assert.match(achievements,/return \{"ok": False, "status": "unavailable"/);
  assert.match(ui,/achievements\.status==="none"\?"No achievements":"Unavailable"/);
  assert.match(ui,/setAchievements\(\{ok:false,status:"unavailable"\}\)/);
});
