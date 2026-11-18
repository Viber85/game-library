import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {expandThemeClassAliases} from "../src/themeClassAliases.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const menu=read("system-theme/menus.css").replace(/\/\*[\s\S]*?\*\//g,"");
const qam=read("system-theme/qam.css").replace(/\/\*[\s\S]*?\*\//g,"");
const compiler=read("src/themeCssCompiler.ts");
const bundle=read("main.py");

/** Prevent the old regression: real Steam MenuItem and QAM Tab nodes were
 * rendered under another container, so only ID-anchored rules never matched. */
test("Steam main menu's real clickable class is independently targeted",()=>{
  assert.match(menu,/:is\(\.mainmenu_Item_2w9Tp,\[class\*="mainmenu_Item_"\],/);
  assert.match(menu,/#MainNavMenuContainer \[role="menuitem"\]/);
  assert.match(menu,/margin:6px 14px !important;/);
  assert.match(menu,/width:calc\(100% - 28px\) !important;/);
  assert.match(menu,/position:relative !important;/);
  assert.match(menu,/border-radius:12px !important;/);
  assert.match(menu,/box-shadow:inset 0 0 0 2px #63cfff,/);
  assert.match(menu,/inset 0 0 0 5px rgba\(48,174,255,\.22\)/);
  assert.match(menu,/inset:4px 8px !important;/,
    "Entire upper/lower/right/left focus frame must be inside row boundaries");
  assert.match(menu,/border:2px solid #63cfff !important;/);
  assert.match(menu,/pointer-events:none !important;/,
    "Purely visual focus frame cannot block Steam menu controls");
  assert.match(menu,/:is\(\.gpfocus,\.gpfocuswithin,:focus-visible,:focus-within\)/);
  assert.doesNotMatch(menu,/:hover/);
});

test("native Steam active and focused states remain separate",()=>{
  assert.match(menu,/\[aria-selected="true"\]\):not\(/);
  assert.match(menu,/background:rgba\(30,78,120,\.32\) !important;/);
  assert.match(menu,/box-shadow:none !important;/);
  assert.doesNotMatch(menu,/display:none|visibility:hidden|z-index:/,
    "Never hide controls or change their native focus order");
});

test("QAM native icon is addressable without any #QuickAccess ancestor",()=>{
  assert.match(qam,/:is\(\.quickaccessmenu_Tab_1S76C,\s*\[class\*="quickaccessmenu_Tab_"\],/);
  assert.match(qam,/#QuickAccess-Menu \[role="tab"\]/);
  assert.match(qam,/:is\(\.quickaccessmenu_Tabs_3Ag1w,\[class\*="quickaccessmenu_Tabs_"\]\)/);
  assert.match(qam,/:is\(\.quickaccessmenu_TabContentColumn_2z5NL,/);
  assert.match(qam,/width:86px !important;/);
  assert.match(qam,/width:74px !important;/);
  assert.match(qam,/padding-inline:5px !important;/);
  assert.match(qam,/margin:5px !important;/);
  assert.match(qam,/width:calc\(100% - 10px\) !important;/);
  assert.doesNotMatch(qam,/#QuickAccess-Menu\s*\{[^}]*\bwidth:/);
  assert.doesNotMatch(qam,/PanelOuterNav[^}]*\bwidth:/,
    "No layout change for plugin content panel");
  assert.doesNotMatch(qam,/overflow\s*:\s*hidden/,
    "No parent overflow clipping");
});

test("QAM selected panel icon keeps an inset cyan ring and focus strengthens it",()=>{
  assert.match(qam,/\.quickaccessmenu_Selected_2QHMu,\[aria-selected="true"\]/);
  assert.match(qam,/:is\(\.gpfocus,\.gpfocuswithin,:focus-visible,:focus-within\)/);
  const matches=qam.match(/box-shadow:inset 0 0 0 2px #63cfff,/g)??[];
  assert.equal(matches.length,2,"Both native selected and actual focused state need a full ring");
  assert.match(qam,/0 0 8px rgba\(3,157,255,\.42\)/);
  assert.match(qam,/0 0 12px rgba\(3,157,255,\.68\)/);
  assert.doesNotMatch(qam,/:hover/);
  assert.doesNotMatch(qam,/(?:#GamepadUI_Full_Root|\.BasicUI)\s*\{/,
    "Full-screen notifications must remain transparent");
});

test("native menu/tab hashed CSS modules are discovered and aliased",()=>{
  for(const name of ["mainmenu","quickaccessmenu"])
    assert.ok(compiler.includes(name+":["),"Missing module "+name);
  const aliases={
    mainmenu:{Item:"_STmenuItem98"},
    quickaccessmenu:{Tab:"_STqamTab98",Tabs:"_STqamTabs83",
      TabContentColumn:"_STqamContent85"},
  };
  const menuCSS=expandThemeClassAliases(menu,aliases);
  const qamCSS=expandThemeClassAliases(qam,aliases);
  assert.match(menuCSS,/\[class~="_STmenuItem98"\]/);
  for(const key of ["_STqamTab98","_STqamTabs83","_STqamContent85"])
    assert.ok(qamCSS.includes('[class~="'+key+'"]'),"Missing hashed alias "+key);
  assert.match(bundle,/"overlay": \([\s\S]*?"menus.css"/);
  assert.match(bundle,/"overlay": \([\s\S]*?"qam.css"/);
  assert.doesNotMatch(menuCSS,/(?:#GamepadUI_Full_Root|\.BasicUI)\s*\{/);
});
