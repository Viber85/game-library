import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const dash=read("src/Dashboard.tsx");
const css=read("src/theme.ts");
const native=read("system-theme/shared.css");
const appearance=read("src/AppearancePage.tsx");
const index=read("src/index.tsx");

test("Our original Home does not suppress Steam #header on native routes",()=>{
  assert.ok(dash.includes('actualRoute!=="/library/home" ? " gl-own-status-only" : ""'));
  assert.match(index,/new HomeReturnGate|<HomeReturnGate native=\{props\.children\}/);
  assert.match(index,/<Dashboard originRoute=\{HOME_ROUTE\}\/>/);
  assert.match(dash,/initialMode==="library"\?\s*LIBRARY_ROUTE:initialMode==="appearance"\?APPEARANCE_ROUTE:\s*searchMode\?SEARCH_ROUTE:collectionsMode\?COLLECTIONS_ROUTE:\s*tabsMode\?TABS_ROUTE:settingsMode\?PLUGIN_SETTINGS_ROUTE:"\/library\/home"/);
});

test("Library, Appearance and Dashboard share our own status bar without native overlay",()=>{
  assert.match(index,/routerHook\.addRoute\(LIBRARY_ROUTE/);
  assert.match(index,/routerHook\.addRoute\(APPEARANCE_ROUTE/);
  assert.match(index,/routerHook\.addRoute\(DASHBOARD_ROUTE/);
  assert.match(dash,/<SystemStatusBar statusRef=\{headerStatusRef\}/);
  assert.match(appearance,/<SystemStatusBar statusRef=\{statusRef\}/);
  assert.match(css,/html:has\(\.gl-root\.gl-own-status-only\) #header \{/);
  assert.match(css,/visibility:hidden !important;/);
  assert.match(css,/pointer-events:none !important;/);
  assert.match(native,/#header \{background:/);
});

test("No global Steam UI suppression, observers or changes to Appearance",()=>{
  const added=css.slice(css.indexOf("/* v0.5.9-test.2"),css.indexOf("/* v0.5.9-test.3"));
  assert.ok(added.length>100);
  assert.doesNotMatch(added,/MutationObserver|querySelector|\.BasicUI|#Footer|display:none|body\.|class\*=/);
  assert.doesNotMatch(added,/\.gl-topbar-status\s*\{/);
  assert.doesNotMatch(dash,/new MutationObserver|querySelectorAll<HTMLElement>\(selector\)/);
  assert.match(appearance,/Theme Hub/);
  assert.doesNotMatch(appearance,/SteamGridDBPanel|UpdatesPanel/);
});

test("Previous native focus and controller behavior are unchanged",()=>{
  assert.match(dash,/if\(mode==="grid"\)\{moveInGrid\(index,button\);return;\}/);
  assert.match(dash,/onGamepadFocus=\{onSelect\}/);
  assert.match(read("system-theme/settings-gamepad-focus.css"),/background:#163a5e !important/);
  assert.match(read("src/builtinThemeRuntime.ts"),/const STYLE_REVISION = "89"/);
});
