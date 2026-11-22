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

test("Owned GOG games open a real details page via A and keep native Steam IDs untouched",()=>{
  const page=read("src/GogLibraryPage.tsx");
  assert.match(page,/onActivate=\{\(\)=>openDetail\(game\)\}/);
  assert.match(page,/setDetailId\(game\.id\)/);
  assert.match(page,/detailGame\?/);
  const sharedDetails=read("src/SharedLibraryDetails.tsx");
  assert.match(sharedDetails,/Back to Library/);
  assert.match(sharedDetails,/onCancelButton=\{onBack\}/);
  assert.match(page,/onBack=\{closeDetail\}/);
  assert.match(page,/getGridColumnCount\(gridRef\.current,5\)/);
  assert.match(page,/gridNeighbor\(index,visible\.length,columns,direction\)/);
  assert.match(page,/GogArtwork game=\{game\} accountId=\{steamId\}/);
  assert.match(page,/GogArtwork game=\{detailGame\} accountId=\{steamId\} expanded/);
  assert.doesNotMatch(page,/openDetails\(game\)|SteamClient\.Apps\.RunGame/);
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
