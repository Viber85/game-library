import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {expandThemeClassAliases} from "../src/themeClassAliases.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const patch=read("system-theme/settings-focus.css").replace(/\/\*[\s\S]*?\*\//g,"");
const old=read("system-theme/settings-extras.css");
const native=read("system-theme/settings.css");
const bundle=read("main.py");

test("All Settings focus outlines are cleared without repainting the blue focus fill",()=>{
  for(const color of ["background:#163a5e !important","background:#1d527d !important"])
    assert.ok(old.includes(color),"Preserve existing focus fill "+color);
  assert.match(native,/background:#205180 !important;/);
  for(const name of ["data-glm-settings-row","data-glm-settings-row-part",
    "data-glm-settings-navitem","gamepadpagedsettings_PagedSettingsDialog_PageListItem",
    "gamepaddialog_Field","gamepaddialog_HighlightOnFocus",
    "networksettings_NetworkItem","networksettings_NetworkListItem",
    "gamepaddropdown_DropDownControlButton","contentmanagement_InstallFolder"])
    assert.ok(patch.includes(name),"Missing Settings category or row "+name);
  const rules=[...patch.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  assert.equal(rules.length,6,"Expected 6 scoped Settings focus rules");
  for(const [,selector,decl] of rules) {
    assert.match(selector,/^\s*(?:html\[data-glm-settings-root\]|\.BasicUI\s+\[class\*="gamepadpagedsettings_PagedSettingsDialog_")/,
      "No changes to unscoped Steam controls");
    assert.match(decl,/outline:none !important;/);
    assert.match(decl,/box-shadow:none !important;/);
    assert.match(decl,/border-color:transparent !important;/);
    assert.doesNotMatch(decl,/\b(?:background|color|width|height|margin|padding|display|position|transform|animation|visibility|overflow|pointer-events|z-index|filter)\s*:/,
      "Existing focus fill and geometry must not change");
  }
  assert.doesNotMatch(patch,/:hover|::before|::after/);
});

test("Settings focus CSS loads last in main ONLY, after Power/Volume",()=>{
  const main=bundle.slice(bundle.indexOf('"main": ('),bundle.indexOf('"overlay": ('));
  const overlay=bundle.slice(bundle.indexOf('"overlay": ('),bundle.indexOf('    result = {}'));
  assert.ok(main.includes('"settings-focus.css"'));
  assert.ok(!overlay.includes('"settings-focus.css"'));
  assert.ok(main.indexOf('"settings-focus.css"')>main.indexOf('"power-menu.css"'));
  assert.ok(main.indexOf('"settings-focus.css"')>main.indexOf('"settings-extras.css"'));
  assert.doesNotMatch(patch,/#QuickAccess-Menu|#MainNavMenuContainer|#GamepadUI_Full_Root|\.audio_|\.gamepadcontextmenu_|\.BasicUIContextMenu/);
});

test("Settings focus selectors support both readable and minified Steam classes",()=>{
  const output=expandThemeClassAliases(patch,{
    gamepadpagedsettings:{PagedSettingsDialog_PageContent:"_xPage98",PagedSettingsDialog_PageListItem:"_xNav97"},
    gamepaddialog:{Field:"_xField96",HighlightOnFocus:"_xHighlight95"},
    networksettings:{NetworkItem:"_xNetwork94"},
    contentmanagement:{InstallFolder:"_xStorage93"},
  });
  for(const key of ["_xPage98","_xNav97","_xField96","_xHighlight95","_xNetwork94","_xStorage93"])
    assert.ok(output.includes('[class~="'+key+'"]'),"Missing hash alias "+key);
});
