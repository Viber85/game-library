import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const sourceFile=source;
const backend=source("main.py"),dashboard=source("src/Dashboard.tsx");
const controls=source("src/index.tsx"),tabs=source("src/tabmaster.ts");

test("Tab source is always automatic, never an overrideable setting",()=>{
  assert.doesNotMatch(backend,/TAB_SOURCES|def _tab_source\(/);
  assert.doesNotMatch(backend,/async def set_tab_source\(/);
  assert.doesNotMatch(backend,/saved\["tab_source"\]/);
  assert.match(backend,/mode = "auto"/);
  assert.match(backend,/root\s*\/\s*"loader.json"/);
  assert.match(backend,/saved\.get\("disabled_plugins", \[\]\)/);
  assert.match(backend,/if "TabMaster" in disabled:/);
  assert.match(backend,/enabled, reason = _tabmaster_enabled\(\)/);
  assert.ok(backend.indexOf("enabled, reason = _tabmaster_enabled()") <
    backend.indexOf("path = _tabmaster_path()",backend.indexOf("async def get_tabmaster_tabs")),
    "Decky disabled status takes priority over stored TabMaster configuration");
});

test("QAM has no tab source selector or save action",()=>{
  assert.doesNotMatch(controls,/\bDropdownItem\b|\bsaveTabSource\b|\bchangeTabSource\b|\btype TabSource\b|\btabSource\s*=/);
  assert.match(controls,/const getSettings = callable<\[\], \{ default_home: boolean \}>/);
  assert.match(controls,/label="Use as Steam Home"/);
  assert.match(controls,/Open Game Library/);
  assert.match(backend,/return \{"default_home": _read_preferences\(\)\.get\("default_home", True\) is True\}/);
});

test("Dashboard switches sources during use without stale selected tab",()=>{
  const source=sourceFile("src/autoTabSource.ts");
  assert.match(source,/window\.setInterval\(\(\)=>\{void sync\.refresh\(\);\},POLL_MS\)/);
  assert.match(dashboard,/subscribeAutoTabs\(setTabInfo\)/);
  assert.match(dashboard,/tabInfo\.available && tabInfo\.tabs\.length \? tabInfo\.tabs : fallbackTabs/);
  assert.match(dashboard,/if\(tabs\.some\(t=>t\.id===activeTab\)\)return;/);
  assert.match(dashboard,/setActiveTab\(tabs\[0\]\?\.id \?\? "AllGames"\)/);
  assert.match(dashboard,/setSelectedId\(undefined\)/);
  assert.doesNotMatch(controls,/Library tabs|changeTabSource/);
  assert.match(tabs,/id:"AllGames", title:"All Games"/);
  assert.match(tabs,/id:"Installed", title:"Installed"/);
});

test("fallback Steam tab filters are wired to actual native Steam collections",()=>{
  assert.match(tabs,/id==="allgames" \? \{allGames:lookups.native\("all-games"\)\}/);
  assert.match(tabs,/id==="installed" \? \{installed:lookups.native\("local-install"\)\}/);
  assert.match(tabs,/id==="favorites" \? \{favorites:lookups.native\("favorite"\)\}/);
  assert.match(tabs,/defaultLibraryTabGames\(tab\.id,games,native\)/);
  assert.match(tabs,/lookups.unified\(source\)/,
    "Do not regress Epic and GOG custom TabMaster collection integration");
});
