import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const menu=read("system-theme/menus.css").replace(/\/\*[\s\S]*?\*\//g,"");
const qam=read("system-theme/qam.css").replace(/\/\*[\s\S]*?\*\//g,"");
const bundle=read("main.py");

test("Steam's left menu has a padded fully outlined focus like our library rail",()=>{
  assert.match(menu,/#MainNavMenuContainer\s+:is\(\[role="menuitem"\],/);
  assert.match(menu,/\.mainmenu_Item_2w9Tp/);
  assert.match(menu,/box-sizing:border-box !important/);
  assert.match(menu,/margin-inline:12px !important/);
  assert.match(menu,/width:calc\(100% - 24px\) !important/);
  assert.match(menu,/border-radius:12px !important/);
  assert.match(menu,/box-shadow:inset 0 0 0 2px #63cfff,/);
  assert.match(menu,/0 0 15px rgba\(3,157,255,\.70\)/);
  assert.match(menu,/\.gpfocus,\.gpfocuswithin,:focus-visible,:focus-within/);
  assert.doesNotMatch(menu,/:hover/,"Mouse hover must not leave a persistent halo");
});

test("Steam's selected menu page remains separate from controller focus",()=>{
  const normal=menu.slice(menu.indexOf('/* Keep 12px'));
  const selected=normal.slice(normal.indexOf('/* The current page'),normal.indexOf('/* Controller/keyboard focus'));
  const focused=normal.slice(normal.indexOf('/* Controller/keyboard focus'));
  // Source is comment-stripped, so use selector anchors instead.
  assert.match(menu,/\[aria-selected="true"\],\.mainmenu_Active_10bq5\)\s*\{[\s\S]*?box-shadow:none !important;/);
  assert.match(menu,/:is\(\.gpfocus,\.gpfocuswithin,:focus-visible,:focus-within\)\s*\{[\s\S]*?box-shadow:inset 0 0 0 2px/);
  assert.match(menu,/background:rgba\(30,78,120,\.32\) !important/);
  assert.doesNotMatch(menu,/display\s*:\s*none|pointer-events\s*:\s*none/,
    "Steam menu navigation cannot be hidden or disabled");
});

test("QAM icon column is enlarged without resizing the entire QAM menu or plugins",()=>{
  assert.match(qam,/#QuickAccess-Menu :is\(\.quickaccessmenu_Tabs_3Ag1w/);
  assert.match(qam,/width:86px !important/);
  assert.match(qam,/min-width:86px !important/);
  assert.match(qam,/flex:0 0 86px !important/);
  assert.match(qam,/padding-inline:8px !important/);
  assert.match(qam,/margin-inline:6px !important/);
  assert.match(qam,/width:calc\(100% - 12px\) !important/);
  assert.doesNotMatch(qam,/#QuickAccess-Menu\s*\{[^}]*\bwidth:/,
    "Do not resize the QAM root or reduce space for plugin content unnecessarily");
  assert.doesNotMatch(qam,/PanelOuterNav[^}]*\bwidth:/,
    "Do not force widths on plugin panels");
  assert.doesNotMatch(qam,/overflow\s*:\s*hidden/,
    "Don't clip the new glow or scroll content");
});

test("QAM keeps a visible inset border and ambient halo only when focused",()=>{
  assert.match(qam,/box-shadow:inset 0 0 0 2px #63cfff,/);
  assert.match(qam,/inset 0 0 8px rgba\(42,192,255,\.35\)/);
  assert.match(qam,/0 0 12px rgba\(3,157,255,\.68\)/);
  assert.match(qam,/:is\(\.gpfocus,\.gpfocuswithin,:focus-visible,:focus-within\)/);
  assert.match(qam,/:is\(\[aria-selected="true"\],\.quickaccessmenu_Selected_2QHMu\)/);
  assert.doesNotMatch(qam,/:hover/);
  assert.doesNotMatch(qam,/(?:#GamepadUI_Full_Root|\.BasicUI)\s*\{/,
    "Volume and achievement overlays must remain transparent");
  assert.match(bundle,/"overlay": \([\s\S]*?"menus.css"/,
    "Steam main menu and QAM styles load only in the native overlay scope");
});
