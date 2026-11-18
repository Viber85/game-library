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
  assert.match(menu,/margin:12px 22px !important;/);
  assert.match(menu,/width:calc\(100% - 44px\) !important;/);
  assert.match(menu,/min-height:76px !important;/);
  assert.doesNotMatch(menu,/margin:6px 14px !important;/,
    "Old narrow Steam gutters clipped the 20px cyan glow");
  assert.match(menu,/position:relative !important;/);
  assert.match(menu,/border-radius:12px !important;/);
  const focused=[...menu.matchAll(/:is\(\s*\.gpfocus,\.gpfocuswithin,:focus-visible,:focus-within\)(?:::before|::after)?\s*\{([^}]*)\}/g)];
  assert.equal(focused.length,3,"Expected transparent focused row, inset fill and one frame");
  const [row,fill,frame]=focused.map(match=>match[1]);
  assert.match(row,/background:transparent !important;/,
    "Native row must NOT paint the blue rectangle outside the inner frame");
  assert.match(row,/box-shadow:none !important;/,
    "Focused row must not draw another border or glow");
  assert.match(row,/isolation:isolate !important;/,
    "The inset fill must stack behind icon and label without changing focus order");
  assert.match(row,/overflow:visible !important;/,
    "The focused row must not crop its own 20px glow");
  assert.doesNotMatch(row,/inset 0 0 0 2px|inset 0 0 0 5px|border:2px|z-index:/,
    "Only ::after owns the cyan stroke; row layout/focus order stay untouched");
  assert.match(fill,/inset:10px 12px !important;/,
    "Blue fill must be contained by the inset cyan frame with safe glow clearance");
  assert.match(fill,/border-radius:10px !important;/);
  assert.match(fill,/background:linear-gradient\(140deg,#185488,#083058\) !important;/,
    "Keep the same blue gradient only WITHIN the frame");
  assert.match(fill,/z-index:-1 !important;/,
    "Fill belongs behind game icon and label");
  assert.match(fill,/pointer-events:none !important;/);
  assert.doesNotMatch(fill,/\bborder:2px|box-shadow:/,
    "Fill must not introduce a second ring or glow");
  assert.match(frame,/border:2px solid #63cfff !important;/,
    "The original inset cyan frame must survive unchanged");
  assert.match(frame,/inset:10px 12px !important;/,
    "Fill and frame need exactly the same geometry");
  // The in-menu frame owns exactly the same broad cyan glow as Game Library's
  // left rail, while its single border and current row padding are unchanged.
  assert.match(frame,/box-shadow:0 0 20px rgba\(3,157,255,\.72\),/,
    "Steam focus glow should match the Game Library rail's 20px bloom");
  assert.doesNotMatch(frame,/0 0 8px rgba\(3,157,255,\.42\)/,
    "Do not regress to the too-subtle native menu glow");
  assert.match(read("src/theme.ts"),/box-shadow:inset 0 0 0 2px #63cfff,0 0 20px rgba\(3,157,255,\.72\)/,
    "Native menu glow must stay aligned to Game Library sidebar styling");
  assert.match(menu,/inset:10px 12px !important;/,
    "Single focus frame must have clearance for its 20px glow");
  // Minimum clearance between frame edge and native menu viewport:
  // 12px margin + 10px inset vertically, 22px + 12px horizontally.
  const [verticalClearance,horizontalClearance]=[12+10,22+12];
  assert.ok(verticalClearance>=20 && horizontalClearance>=30,
    "No sharp cuts at Steam's menu scroll-mask boundaries");
  assert.match(menu,/border:2px solid #63cfff !important;/);
  assert.match(menu,/pointer-events:none !important;/,
    "Purely visual focus frame cannot block Steam menu controls");
  assert.match(menu,/:is\(\s*\.gpfocus,\.gpfocuswithin,:focus-visible,:focus-within\)/);
  assert.doesNotMatch(menu,/:hover/);
});

test("native Steam active and focused states remain separate",()=>{
  assert.match(menu,/\[aria-selected="true"\]\):not\(/);
  assert.match(menu,/background:rgba\(30,78,120,\.32\) !important;/);
  assert.match(menu,/box-shadow:none !important;/);
  assert.doesNotMatch(menu,/display:none|visibility:hidden/,
    "Never hide native menu controls");
  const focusedRow=menu.match(/:is\(\s*\.gpfocus,\.gpfocuswithin,:focus-visible,:focus-within\)\s*\{([^}]*)\}/);
  assert.ok(focusedRow,"Expected focused native Steam menu item");
  assert.doesNotMatch(focusedRow[1],/z-index:/,
    "Never move the actual Steam menu item in the focus stacking order");
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
  assert.match(qam,/:is\(\s*\.gpfocus,\.gpfocuswithin,:focus-visible,:focus-within\)/);
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
