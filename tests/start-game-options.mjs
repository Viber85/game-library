import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const dashboard=file("src/Dashboard.tsx");
const menu=file("src/nativeGameContextMenu.tsx");
const card=dashboard.slice(dashboard.indexOf("function GameCard("),
  dashboard.indexOf("export function Dashboard("));

test("Select/View is unassigned; no previous Game Details shortcut remains",()=>{
  assert.doesNotMatch(card,/GamepadButton\.SELECT/);
  assert.doesNotMatch(card,/actionDescriptionMap=\{\{\[GamepadButton\.SELECT\]/);
  assert.doesNotMatch(card,/onSelectButton=/);
  assert.doesNotMatch(card,/onOptionsButton=\{\(\) => openDetails\(game\)\}/);
});

test("START opens native context menu for the actual focused game via Decky onMenuButton",()=>{
  assert.match(card,/onMenuButton=\{\(e:GamepadEvent\)=>\{/);
  assert.match(card,/consume\(e\);\s*const opened=showNativeGameOptions\(game\.id,e\.currentTarget\)/);
  assert.match(card,/onMenuActionDescription="Game options"/);
  assert.match(dashboard,/Start: Game options/);
  assert.doesNotMatch(card,/onMenuButton=\{.*openDetails/);
});

test("Y remains sort while A and B keep their existing functions",()=>{
  assert.match(card,/onOptionsButton=\{\(e:GamepadEvent\)=>\{consume\(e\);onSort\(\);\}\}/);
  assert.match(card,/onOptionsActionDescription="Sort games"/);
  assert.match(card,/onActivate=\{activate \?\? \(\(\) => play\(game\)\)\}/);
  assert.match(card,/onCancelButton=\{onCancel\}/);
  assert.match(dashboard,/activate=\{\(\)=>openGameDetails\(game\)\}/);
  assert.match(dashboard,/openDetails\(game\);/);
  assert.equal((dashboard.match(/onSort=\{showSortMenu\}/g)||[]).length,3);
});

test("Steam's real context menu is dynamically resolved, never hard-coded or recreated",()=>{
  assert.match(menu,/findModuleByExport/);
  assert.match(menu,/sourceOf\(exported\)/);
  assert.match(menu,/s\.includes\("bFitToWindow"\)&&s\.includes\("LibraryContextMenu"\)/);
  assert.match(menu,/s\.includes\("navigator:"\)&&s\.includes\("instance:"\)/);
  assert.match(menu,/options\.length!==1\|\|renderers\.length!==1/);
  assert.match(menu,/showContextMenu\(element,target,opts\)/);
  assert.match(menu,/Number\(overview\.appid\)!==gameId/);
  assert.match(menu,/client:"mostavailable"/);
  assert.match(menu,/launchSource:1000/);
  assert.match(menu,/bInGamepadUI:true/);
  assert.doesNotMatch(menu,/MenuItem|Add to Favorites|Manage|Developer|Change Artwork/);
});

test("Native menu helper fails closed; never sends gamepad key synthetic events",()=>{
  assert.match(menu,/return false;/);
  assert.match(dashboard,/Steam game options unavailable on this client/);
  assert.doesNotMatch(menu,/dispatchEvent|KeyboardEvent|\.click\(\)|Navigate\(\x22\/library/);
  assert.doesNotMatch(menu,/prototype\.render\s*=/);
});
