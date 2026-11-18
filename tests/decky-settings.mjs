import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {
  STEAM_SETTINGS_MARK_SCRIPT,THEME_AUDIT_INSTALL_SCRIPT,THEME_AUDIT_REMOVE_SCRIPT
} from "../src/themeProbe.ts";
import {expandThemeClassAliases} from "../src/themeClassAliases.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("system-theme/decky-settings.css").replace(/\/\*[\s\S]*?\*\//g,"");
const bundle=read("main.py");
const marker=STEAM_SETTINGS_MARK_SCRIPT;

test("Decky Loader v3.3.1 route replaces guessed four-row recognition",()=>{
  // Verified from SteamDeckHomebrew/decky-loader v3.3.1:
  // frontend/src/plugin-loader.tsx: routerHook.addRoute('/decky/settings',...)
  // frontend/src/components/settings/index.tsx: SidebarNavigation pages.
  assert.match(marker,/isDeckySettingsRoute\(path\)\|\|isDeckySettingsRoute\(hash\)/);
  assert.match(marker,/mark\(document\.documentElement,'data-glm-decky-settings'\)/);
  assert.doesNotMatch(marker,/nav\.length===4|if\(deckySettings\)/);
});

test("Decky 3.3.1 actually uses Steam SidebarNavigation, Field, DialogButton and DialogBody",()=>{
  for(const semantic of [
    "gamepadpagedsettings_PagedSettingsDialog_PageContent",
    "gamepadpagedsettings_PagedSettingsDialog_PageListColumn",
    "gamepadpagedsettings_PagedSettingsDialog_PageListItem",
    "gamepaddialog_Field_","DialogControlsSection","DialogBody",
    "DialogButton","gamepaddropdown_DropDownControlButton_"
  ])assert.ok(css.includes(semantic),"Missing source-confirmed class "+semantic);
  // @decky/ui ReorderableList is composed of native Field wrappers, not
  // a 'reorderablelist_Entry' class (verified in v4.16.4 source).
  assert.doesNotMatch(css,/reorderablelist_Entry|ReorderableEntry/);
  assert.doesNotMatch(css,/\[class\*="gamepaddialog_Field"\]/,
    "Broad Field matches must not also paint labels/icons/descriptions");
  for(const color of ["#0a1b30","#081425","#0f2842","#163a5e","#123452","#1d527d"])
    assert.ok(css.includes(color),"Missing Midnight palette "+color);
  for(const [,selector,body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    assert.match(selector,
      /html\\[data-glm-decky-settings\\]|html:has\\(\\.BasicUI \\.PageListColumn\\):has\\(\\.BasicUI \\.DialogControlsSection\\)/,
      "Every Decky selector must be scoped to a route marker or OBSERVED Steam DOM signature");
    assert.doesNotMatch(body,/(?:^|[;\n])\s*(?:width|height|margin|padding|position|display|visibility|overflow|transform|pointer-events|z-index)\s*:/);
  }
  assert.match(css,/\\.Panel:has\\(> \\.PageListColumn\\)/,
    "Observed rail is in a separate native Steam .Panel");
  assert.match(css,/\\.Panel:has\\(\\.DialogControlsSection\\)/,
    "Observed right-side content is in its own native Steam .Panel");
  assert.match(css,/\\[class\\*="eKmEXJCm_"\\]/,
    "Use the exact actual gray field class family from test.17 device screenshots");
  assert.match(css,/--glm-decky-observed-layout:1/,
    "Enable computed-CSS proof of native direct selectors");
    assert.doesNotMatch(css,/box-shadow:inset|border:[0-9]+px/,"No Settings cyan focus ring");
});

test("Actual minified Steam CSS aliases cover all Decky UI structural components",()=>{
  const expanded=expandThemeClassAliases(css,{
    gamepadpagedsettings:{
      PagedSettingsDialog_PageContent:"_actualPage",
      PagedSettingsDialog_PageListItem:"_actualNav",
      PagedSettingsDialog_PageListColumn:"_actualRail",
      Active:"_actualActive",
    },
    gamepaddialog:{Field:"_actualField"},
    gamepaddropdown:{DropDownControlButton:"_actualDropdown"}
  });
  for(const name of ["_actualPage","_actualNav","_actualRail",
    "_actualField","_actualDropdown"])
    assert.ok(expanded.includes('[class~="'+name+'"]'),"Missing alias "+name);
});

test("Decky Settings route activates even with ZERO rendered tabs or loading content",()=>{
  const attrs=new Map();
  const html={
    hasAttribute:k=>attrs.has(k),
    getAttribute:k=>attrs.get(k)??null,
    setAttribute:(k,v)=>attrs.set(k,String(v)),
    removeAttribute:k=>attrs.delete(k),
  };
  const root={};
  const nodes=[html];
  const document={
    documentElement:html,
    querySelector:q=>q===".BasicUI"?root:null,
    querySelectorAll:q=>q.includes("data-glm-")?nodes.filter(n=>
      q.split(",").some(part=>{
        const m=part.match(/\[([^\]]+)\]/);return m&&n.hasAttribute(m[1]);
      })):[],
    elementsFromPoint:()=>[],
  };
  const window={innerWidth:1280,innerHeight:800,location:{pathname:"/decky/settings",hash:""}};
  const run=()=>vm.runInNewContext(marker,{document,window,Math,Map,Set,Array,String,Boolean});
  assert.equal(run(),true);
  assert.equal(html.hasAttribute("data-glm-decky-settings"),true,
    "The route marker must not depend on visible Field or nav rows");
  for(const route of ["/decky/settings/general","/decky/settings/plugins",
    "/decky/settings/developer","/decky/settings/testing"]){
    window.location.pathname=route;
    assert.equal(run(),true,route);
    assert.equal(html.hasAttribute("data-glm-decky-settings"),true,route);
  }
  window.location.pathname="/library/home";window.location.hash="#/decky/settings/plugins";
  assert.equal(run(),true,"Hash-router fallback is also a real Decky Settings path");
  window.location.pathname="/decky/store";window.location.hash="";
  assert.equal(run(),false);
  assert.equal(html.hasAttribute("data-glm-decky-settings"),false,
    "Decky Store cannot receive Settings colors");
  window.location.pathname="/settings/display";
  assert.equal(run(),false);
  assert.equal(html.hasAttribute("data-glm-decky-settings"),false,
    "Native Steam settings must retain their established theme");
  window.location.pathname="/decky/settings-other";
  assert.equal(run(),false,"Prefix-only false positive should be excluded");
});

test("Decky CSS is main-window-only, preloaded, and cleaned on exit",()=>{
  const main=bundle.slice(bundle.indexOf('"main": ('),bundle.indexOf('"overlay": ('));
  const overlay=bundle.slice(bundle.indexOf('"overlay": ('),bundle.indexOf('    result = {}'));
  assert.ok(main.includes('"decky-settings.css"'));
  assert.ok(!overlay.includes('"decky-settings.css"'));
  assert.match(THEME_AUDIT_INSTALL_SCRIPT,/new MutationObserver/);
  assert.match(THEME_AUDIT_INSTALL_SCRIPT,/attributeFilter:\['class','style','aria-selected','aria-checked'\]/);
  assert.match(THEME_AUDIT_REMOVE_SCRIPT,/data-glm-decky-settings/);
});
