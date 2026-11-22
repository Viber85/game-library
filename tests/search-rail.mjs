import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const dash=read("src/Dashboard.tsx");
const status=read("src/SystemStatusBar.tsx");
const app=read("src/AppearancePage.tsx");
const search=read("src/LibrarySearchToolbar.tsx");

test("Search remains persistent while Settings and Appearance stay in the left rail",()=>{
  const items=[...dash.matchAll(/\{ id: "(home|library|search|collections|appearance|settings|steam-menu)"/g)]
    .map(match=>match[1]);
  assert.deepEqual(items,["home","library","search","collections","appearance","settings","steam-menu"]);
  assert.match(dash,/\{ id: "search", label: "Search", icon: MdSearch, go: openLocalSearch \}/);
  assert.match(dash,/searchMode\?"search":initialMode==="library"\?"library":"home"/);
  assert.match(dash,/searchMode\?"search":initialMode==="library"\?"library":"home"/);
  assert.match(dash,/id:"running",label:runningGame.title/);
  assert.match(dash,/lastRailId\.current=action\.id/);
});

test("Top statusbar has no Search icon, button or Steam native Search fallback",()=>{
  assert.doesNotMatch(status,/MdSearch|gl-topbar-search|onSearch|Navigate\("\/search"\)/);
  assert.match(status,/<Focusable ref=\{statusRef\} className="gl-topbar-icon gl-topbar-notifications"/);
  assert.match(status,/onActivate=\{\(\)=>Navigation.Navigate\("\/notifications"\)\}/);
  for(const part of ["gl-topbar-wifi","gl-topbar-bluetooth","gl-topbar-battery","gl-topbar-clock","gl-topbar-avatar"])
    assert.ok(status.includes(part),part);
  assert.match(dash,/<SystemStatusBar statusRef=\{headerStatusRef\}/);
  assert.match(app,/<SystemStatusBar statusRef=\{statusRef\}/);
});

test("Rail Search A/Right focuses editable field and other pages navigate to Search",()=>{
  assert.match(dash,/const openLocalSearch=\(\)=>\{/);
  assert.match(dash,/if\(searchMode\)\{\s*\/\/ A on the selected Search rail item/);
  assert.match(dash,/rememberSearchOrigin\(actualRoute\)/);
  assert.match(dash,/Navigation.Navigate\(SEARCH_ROUTE\)/);
  assert.match(dash,/if\(searchMode\)\{\s*\/\/ Right\/B from the expanded Search rail/);
  assert.match(dash,/searchInputRef\.current\?\.querySelector\("input"\)\?\.focus\(\)/);
  assert.match(dash,/else if \(button === GamepadButton.DIR_RIGHT\) \{ consume\(e\); if\(steamDetailsGame\)focusDetailsFromRail\(\); else goToGame\(\); \}/);
  assert.match(search,/<TextField aria-label="Search game titles"/);
});

test("Unchanged focus and Game Details support across the library",()=>{
  assert.match(dash,/if\(mode==="grid"\)\{moveInGrid\(index,button\);return;\}/);
  assert.match(dash,/openGameDetails\(entry.steam\)/);
  assert.match(dash,/onCancel=\{mode==="grid"\?exitGrid:undefined\}/);
  assert.match(dash,/if\(searchMode\)Navigation.Navigate\(searchBackRoute\(\)\)/);
  assert.match(dash,/focusRail\(railIndex\)/);
  assert.match(app,/Theme Hub/);
  assert.match(read("system-theme/settings-gamepad-focus.css"),/background:#163a5e !important/);
});
