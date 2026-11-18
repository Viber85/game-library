import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  STEAM_SETTINGS_MARK_SCRIPT,THEME_AUDIT_REMOVE_SCRIPT
} from "../src/themeProbe.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("system-theme/settings-special.css").replace(/\/\*[\s\S]*?\*\//g,"");
const bundle=read("main.py");

test("Wi-Fi networks, Keyboard layouts and Customization cards have native-sized Midnight fills",()=>{
  for(const page of ["internet","keyboard","customization"]){
    assert.ok(css.includes('[data-glm-settings-page="'+page+'"]'),page);
    assert.ok(STEAM_SETTINGS_MARK_SCRIPT.includes("'"+page+"'"),page+" route marker");
  }
  assert.match(css,/background:#0f2842 !important;/,"Idle rows are deep blue");
  assert.match(css,/background:#163a5e !important;/,"Focused rows are lighter blue");
  assert.match(css,/animation-name:none !important;/,"Native Steam focus animation cannot repaint gray");
  for(const key of ["data-glm-settings-special-row","data-glm-settings-special-part"])
    assert.ok(css.includes(key),key);
  for(const [,selector,decl] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    assert.match(selector,/html\[data-glm-settings-root\]/);
    assert.match(selector,/data-glm-settings-page/);
    assert.doesNotMatch(decl,/\b(?:width|height|margin|padding|transform|position|display|visibility|pointer-events|z-index|overflow|border-width|border-style|filter|opacity)\s*:/,
      "Do not change Steam layout, focus order, or preview images");
  }
  assert.doesNotMatch(css,/#QuickAccess-Menu|#GamepadUI_Full_Root|\.BasicUIContextMenu|:root\s*\{/);
  assert.doesNotMatch(css,/box-shadow:inset|border:[0-9]+px/,"No glow or focus ring");
});

test("Visual-only watcher marks wide focusables, never switches/sliders or private strings",()=>{
  const source=STEAM_SETTINGS_MARK_SCRIPT;
  assert.match(source,/getBoundingClientRect/);
  assert.match(source,/role==='radio'/);
  assert.match(source,/hasControl/);
  assert.match(source,/data-glm-settings-page/);
  assert.match(source,/data-glm-settings-special-row/);
  assert.match(source,/data-glm-settings-special-part/);
  assert.match(source,/settingsPage && mainPane\?\.querySelectorAll/);
  assert.doesNotMatch(source,/\.innerText|\.textContent|networkName|\bssid\b|localStorage|sessionStorage|\.value\b/i);
  assert.match(THEME_AUDIT_REMOVE_SCRIPT,/data-glm-settings-special-row/);
  assert.match(THEME_AUDIT_REMOVE_SCRIPT,/data-glm-settings-special-part/);
  assert.match(THEME_AUDIT_REMOVE_SCRIPT,/data-glm-settings-page/);
});

test("Special styling loads only in Steam main, before no-outline focus patch",()=>{
  const main=bundle.slice(bundle.indexOf('"main": ('),bundle.indexOf('"overlay": ('));
  const overlay=bundle.slice(bundle.indexOf('"overlay": ('),bundle.indexOf('    result = {}'));
  assert.match(main,/"settings-special.css"/);
  assert.doesNotMatch(overlay,/"settings-special.css"/);
  assert.ok(main.indexOf('"settings-special.css"')>main.indexOf('"settings-extras.css"'));
  assert.ok(main.indexOf('"settings-special.css"')<main.indexOf('"settings-focus.css"'));
});
