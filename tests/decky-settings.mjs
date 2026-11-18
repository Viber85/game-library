import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {STEAM_SETTINGS_MARK_SCRIPT,THEME_AUDIT_INSTALL_SCRIPT,THEME_AUDIT_REMOVE_SCRIPT}
 from "../src/themeProbe.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("system-theme/decky-settings.css").replace(/\/\*[\s\S]*?\*\//g,"");
const main=read("main.py");

test("Decky page has isolated Midnight palette with no geometry changes",()=>{
  for(const s of ["data-glm-decky-settings","data-glm-settings-main",
    "data-glm-settings-sidebar","data-glm-settings-navitem",
    "data-glm-settings-row","data-glm-settings-special-row",
    "gamepaddialog_Field","reorderablelist_Entry","DialogButton"])
    assert.ok(css.includes(s),"Missing Decky element "+s);
  for(const c of ["#0a1b30","#081425","#0f2842","#163a5e","#123452","#1d527d"])
    assert.ok(css.includes(c),"Missing Midnight palette entry "+c);
  for(const [,selector,decl] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    assert.match(selector,/html\[data-glm-decky-settings\]/);
    assert.doesNotMatch(decl,/\b(?:width|height|padding|margin|position|display|visibility|pointer-events|overflow|transform|z-index)\s*:/);
  }
  assert.doesNotMatch(css,/box-shadow:inset|border:[0-9]+px/);
});

test("Decky stylesheet loads once in main and a pre-paint observer marks its route",()=>{
  const mainScope=main.slice(main.indexOf('"main": ('),main.indexOf('"overlay": ('));
  const overlay=main.slice(main.indexOf('"overlay": ('),main.indexOf('    result = {}'));
  assert.ok(mainScope.includes('"decky-settings.css"'));
  assert.ok(!overlay.includes('"decky-settings.css"'));
  assert.ok(mainScope.indexOf('"decky-settings.css"')>mainScope.indexOf('"settings-focus.css"'));
  assert.match(STEAM_SETTINGS_MARK_SCRIPT,/if\(deckySettings\)mark\(document.documentElement,'data-glm-decky-settings'\)/);
  assert.match(STEAM_SETTINGS_MARK_SCRIPT,/nav\.length===4/);
  assert.match(THEME_AUDIT_INSTALL_SCRIPT,/new MutationObserver/);
  assert.match(THEME_AUDIT_INSTALL_SCRIPT,/attributeFilter:\['class','style','aria-selected','aria-checked'\]/);
  assert.match(THEME_AUDIT_REMOVE_SCRIPT,/data-glm-decky-settings/);
});
