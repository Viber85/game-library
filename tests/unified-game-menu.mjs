import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const menu=read("src/UnifiedGameContextMenu.tsx");
const own=read("src/gameCollectionsActions.ts");
const steam=read("src/SteamGameDetails.tsx");
const gog=read("src/SharedLibraryDetails.tsx");
const dash=read("src/Dashboard.tsx");
const styles=read("src/theme.ts");

test("exactly five unified actions for Steam and GOG; Start and gear share them",()=>{
  const keys=[...menu.matchAll(/key:"(primary|collections|controller|artwork|properties)"/g)]
    .map(m=>m[1]);
  assert.deepEqual(keys,["primary","collections","controller","artwork","properties"]);
  assert.match(menu,/primaryLabel/);
  assert.match(menu,/Add to Collections/);
  assert.match(menu,/Controller Settings/);
  assert.match(menu,/Change Artwork/);
  assert.match(menu,/Game Properties/);
  assert.match(menu,/<ModalRoot onCancel=\{goBack\}/);
  assert.match(menu,/onCancelButton=\{goBack\}/);
  assert.match(menu,/preferredFocus=\{index===0\}/);
  assert.match(steam,/showModal\(<UnifiedGameContextMenu/);
  assert.match(gog,/showModal\(<UnifiedGameContextMenu/);
  assert.match(steam,/optionsActionRef\.current=openGameOptions/);
  assert.match(gog,/optionsActionRef\.current=openGogOptions/);
  assert.match(styles,/\.gl-unified-context-item/);
});

test("SteamGridDB link uses its installed Decky route with signed non-Steam app IDs",()=>{
  assert.match(menu,/Navigation\.Navigate\("\/steamgriddb\/"\+routeId\)/);
  assert.match(menu,/actual>=0x80000000\?actual\|0:actual/);
  assert.match(menu,/canonicalSteamAppId/);
  assert.match(dash,/onOpenArtwork=\{\(\)=>openSteamArtwork\(steamDetailsGame\)\}/);
  assert.match(dash,/onOpenArtwork=\{appId=>openGogArtwork\(detailGog\.id,appId\)\}/);
  assert.match(dash,/armGogDetailsReturn\(actualRoute,productId,lastGridFocusIndex\.current\)/);
});

test("Game Properties uses Steam's real native Settings dialog, not a clone",()=>{
  assert.match(menu,/apps\.OpenAppSettingsDialog\(actual,"general"\)/);
  assert.doesNotMatch(menu,/SetShortcutLaunchOptions|SpecifyCompatTool|shortcuts\.vdf/);
  assert.match(menu,/const id=canonical\(appId\)/);
  assert.match(menu,/if\(id===null\)\{missingShortcut\("Game Properties"\)/);
  assert.match(gog,/appId=\{gogShortcutAppId\}/);
  assert.match(steam,/appId=\{game\.id\}/);
});

test("collections include Game Library custom and real Steam collections",()=>{
  assert.match(own,/loadManualCollections\(\)/);
  assert.match(own,/changeManualCollection\(section,id>>>0,include\)/);
  assert.match(own,/getAutoTabs\(\)\.tabs\.filter\(t=>t\.kind==="custom"&&t\.visible\)/);
  assert.match(own,/saveOwnTabs\(updated\)/);
  assert.match(own,/assignManualGames/);
  assert.match(own,/assignSmartExceptions/);
  assert.match(own,/collectionStore\?:CollectionStore/);
  assert.match(own,/userCollections/);
  assert.match(own,/drag\.AddApps\(\[\{appid:id\}\]\)/);
  assert.match(own,/await collection\.Save\?\.\(\)/);
  assert.match(menu,/Game Library lists/);
  assert.match(menu,/Our custom collections/);
  assert.match(menu,/Steam collections/);
  assert.match(menu,/setChoices\(items=>items\.map/);
});

test("unregistered GOG product IDs cannot be used with Steam APIs",()=>{
  assert.match(menu,/if\(id===null\)\{missingShortcut\("Add to Collections"\)/);
  assert.match(menu,/if\(id===null\)\{missingShortcut\("Controller Settings"\)/);
  assert.match(menu,/if\(id===null\)\{missingShortcut\("Change Artwork"\)/);
  assert.match(menu,/if\(id===null\)\{missingShortcut\("Game Properties"\)/);
  assert.match(gog,/appId=\{gogShortcutAppId\}/);
  assert.doesNotMatch(gog,/appId=\{Number\(game\.storeId\)\}/);
});

test("compact menu is centered and both main actions and collections use same row size",()=>{
  assert.match(styles,/\.gl-unified-context-modal\{[\s\S]*?margin-inline:auto/);
  assert.match(styles,/\.gl-unified-context-heading\{[\s\S]*?justify-content:center/);
  assert.match(styles,/\.gl-unified-context-heading\{[\s\S]*?text-align:center/);
  assert.match(styles,/\.gl-unified-context \.gl-unified-context-item\{[\s\S]*?height:44px;min-height:44px;box-sizing:border-box/);
  assert.match(styles,/\.gl-unified-context-item span\{[\s\S]*?text-align:center/);
  assert.match(styles,/\.gl-unified-context-item>svg\{[\s\S]*?position:absolute;left:12px/);
  assert.match(styles,/\.gl-unified-context-group\{[\s\S]*?text-align:center/);
  assert.match(styles,/\.gl-unified-context-section\{[\s\S]*?gap:4px/);
  assert.equal((menu.match(/className="gl-unified-context-item"/g)||[]).length,2,
    "main and collection rows share the same compact class");
  assert.doesNotMatch(styles,/padding:11px 12px;min-height:44px/);
});
