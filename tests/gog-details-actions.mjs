import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {validGogStoreUrl} from "../src/gogStoreUrl.ts";
import {
  armGogDetailsReturn,consumeGogDetailsReturn,clearGogDetailsReturn
} from "../src/gogDetailsReturn.ts";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const ui=read("src/SharedLibraryDetails.tsx");
const dash=read("src/Dashboard.tsx");
const g=read("gog_store.py");
const api=read("gog.py");
const backend=read("main.py");
const pkg=read("scripts/package.sh");

test.afterEach(()=>clearGogDetailsReturn());

test("GOG Store link is a verified direct product page, not a guessed ID or a redirect",()=>{
  for(const url of [
    "https://www.gog.com/en/game/commandos_behind_enemy_lines",
    "https://www.gog.com/en/game/serious_sam_the_second_encounter"
  ]) assert.equal(validGogStoreUrl(url),true,url);
  for(const url of [
    "https://www.gog.com/en/game/../downloads",
    "https://www.gog.com/en/games",
    "https://www.gog.com/game/title",
    "https://fake.gog.com/en/game/commandos",
    "https://www.gog.com/en/game/123?return=https://evil.com",
    "steam://store/123",
    "javascript:alert(1)"
  ]) assert.equal(validGogStoreUrl(url),false,url);
  assert.match(g,/gog\._http_json\(/);
  assert.match(g,/https:\/\/api\.gog\.com\/products\//);
  assert.match(g,/_validated_link\(product,data\)/);
  assert.match(g,/str\(data\.get\("id", ""\)\) != product/);
  assert.match(api,/"api\.gog\.com"/);
  assert.match(backend,/async def gog_store_link\(self, account_id: str, product_id: str\):/);
  assert.match(pkg,/gog_achievements\.py gog_store\.py/);
});

test("GOG details uses the same four focusable secondary actions as Steam",()=>{
  for(const id of ["hltb","gog-store","controller","settings"]){
    assert.ok(ui.includes('onAction("'+id+'")'),id+" missing native focus");
  }
  assert.match(ui,/<div className="gl-details-action-tools">/);
  assert.match(ui,/HLTB details <MdOpenInNew\/>/);
  assert.match(ui,/GOG Store <MdOpenInNew\/>/);
  assert.match(ui,/onActivate=\{openGogController\}/);
  assert.match(ui,/onActivate=\{openGogOptions\}/);
  assert.match(ui,/onMenuButton:\(event:GamepadEvent\)=>/);
  assert.match(ui,/if\(!event\.detail\?\.is_repeat\)optionsActionRef\.current\(\)/);
  assert.match(ui,/showNativeGameOptions\(gogShortcutAppId,anchor\)/);
  assert.match(ui,/showContextMenu\(menu,anchor\?\?undefined/);
  assert.match(ui,/onGamepadFocus:/);
  assert.match(ui,/nextGamepadControl\(rootRef\.current,current,direction,/);
});

test("GOG links and controller settings use provider-specific route-scoped return",()=>{
  assert.match(dash,/onOpenHltb=\{url=>openGogDetailsWeb\(detailGog\.id,"hltb",url\)\}/);
  assert.match(dash,/onOpenGogStore=\{url=>openGogDetailsWeb\(detailGog\.id,"store",url\)\}/);
  assert.match(dash,/openGogControllerSettings\(detailGog\.id,appId\)/);
  assert.match(dash,/Navigation\.NavigateToExternalWeb\(url\)/);
  assert.match(dash,/openSteamControllerEditor\(appId\)/);
  assert.match(dash,/consumeGogDetailsReturn\(actualRoute\)/);
  assert.match(dash,/gogReturn\?\.productId\?\?null/);
  assert.doesNotMatch(dash,/openSteamControllerEditor\(Number\(detailGog\.id\)\)/);
});

test("GOG return token is scoped, expires and is one-shot",()=>{
  const route="/game-library/library",id="1207662193";
  assert.equal(armGogDetailsReturn(route,id,4,1000),true);
  assert.equal(consumeGogDetailsReturn("/game-library/search",1200),null);
  assert.deepEqual(consumeGogDetailsReturn(route,1200),{productId:id,index:4});
  assert.equal(consumeGogDetailsReturn(route,1210),null);
  assert.equal(armGogDetailsReturn(route,id,4,1000),true);
  assert.equal(consumeGogDetailsReturn(route,10*60*1000+1001),null);
  assert.equal(armGogDetailsReturn(route,"../evil",4,1000),false);
  assert.equal(armGogDetailsReturn("https://evil.com",id,4,1000),false);
  assert.equal(armGogDetailsReturn(route,id,-1,1000),false);
});
