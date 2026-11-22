import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("GOG Settings main card shows green checked account status only when linked",()=>{
  const page=read("src/PluginSettingsPage.tsx");
  const css=read("src/theme.ts");
  assert.match(page,/get_gog_account/);
  assert.match(page,/getActiveUserId/);
  assert.match(page,/gogAccount\?\.connected&&<MdCheckCircle/);
  assert.match(page,/gl-gog-connected-check/);
  assert.match(css,/svg\.gl-gog-connected-check\s*\{\s*color:#57d993/);
  assert.match(page,/owned games · Account connected/);
});

test("GOG uses Dashboard's grid and provider-specific details instead of a separate page",()=>{
  const page=read("src/Dashboard.tsx");
  const card=read("src/GogDashboardCard.tsx");
  const sharedDetails=read("src/SharedLibraryDetails.tsx");
  assert.match(page,/renderEntry\(entry,index,"grid"\)/);
  assert.match(page,/openGogDetails\(entry,index\)/);
  assert.match(page,/detailGog \? <SharedLibraryDetails/);
  assert.match(page,/onBack=\{closeGogDetails\}/);
  assert.match(card,/onActivate=\{onActivate\}/);
  assert.match(card,/onButtonDown=\{direction\}/);
  assert.match(card,/GogArtwork game=\{entry.gog\}/);
  assert.match(sharedDetails,/onCancelButton=\{onBack\}/);
  assert.doesNotMatch(page,/GogLibraryPage|SteamClient\.Apps\.RunGame\(entry\.gog/);
});

test("GOG native images are preferred; SteamGridDB is an opt-in visibility-aware fallback",()=>{
  const ui=read("src/GogArtwork.tsx");
  const backend=read("main.py");
  const gog=read("gog.py");
  assert.match(ui,/subscribeArtworkSettingsChanged/);
  assert.match(ui,/IntersectionObserver/);
  assert.match(ui,/candidates\[index\]\|\|remote/);
  assert.match(ui,/!visible\|\|candidates\[index\]\|\|triedRemote/);
  assert.match(ui,/gog_steamgriddb_art/);
  assert.match(gog,/gog-statics/);
  assert.match(gog,/_glx_vertical_cover\.webp/);
  assert.match(gog,/needs_art_refresh/);
  assert.match(backend,/async def gog_steamgriddb_art/);
  assert.match(backend,/any\(/);
  assert.match(backend,/provider\.read_key/);
  assert.match(backend,/steamgriddb_enabled/);
});
