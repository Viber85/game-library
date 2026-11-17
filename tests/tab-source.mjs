import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const backend=source("main.py"),dashboard=source("src/Dashboard.tsx");
const controls=source("src/index.tsx"),tabs=source("src/tabmaster.ts");

test("Auto is the default and Decky disabled_plugins overrides saved TabMaster tabs",()=>{
  assert.match(backend,/TAB_SOURCES\s*=\s*\("auto", "steam", "tabmaster"\)/);
  assert.match(backend,/get\("tab_source", "auto"\)/);
  assert.match(backend,/root\s*\/\s*"loader.json"/);
  assert.match(backend,/saved\.get\("disabled_plugins", \[\]\)/);
  assert.match(backend,/if "TabMaster" in disabled:/);
  assert.match(backend,/mode = _tab_source\(\)/);
  assert.match(backend,/enabled, reason = _tabmaster_enabled\(\)/);
  assert.ok(backend.indexOf("enabled, reason = _tabmaster_enabled()") <
    backend.indexOf("path = _tabmaster_path()",backend.indexOf("async def get_tabmaster_tabs")),
    "Never read stale TabMaster settings before checking the loader");
});

test("QAM exposes Auto, Steam and TabMaster with persisted selection",()=>{
  assert.match(controls,/DropdownItem label="Library tabs"/);
  assert.match(controls,/data:"auto",label:"Auto \(recommended\)"/);
  assert.match(controls,/data:"steam",label:"Steam"/);
  assert.match(controls,/data:"tabmaster",label:"TabMaster"/);
  assert.match(controls,/selectedOption=\{source\}/);
  assert.match(controls,/saveTabSource\(next\)/);
  assert.match(backend,/async def set_tab_source\(self, source: str\)/);
});

test("Dashboard switches sources during use without stale selected tab",()=>{
  assert.match(dashboard,/window\.setInterval\(\(\) => \{ void refresh\(\); \}, 6000\)/);
  assert.match(dashboard,/tabInfo\.available && tabInfo\.tabs\.length \? tabInfo\.tabs : fallbackTabs/);
  assert.match(dashboard,/if\(tabs\.some\(t=>t\.id===activeTab\)\)return;/);
  assert.match(dashboard,/setActiveTab\(tabs\[0\]\?\.id \?\? "AllGames"\)/);
  assert.match(dashboard,/setSelectedId\(undefined\)/);
  assert.match(dashboard,/tabInfo\.mode==="tabmaster"/);
  assert.match(tabs,/id:"AllGames", title:"All Games"/);
  assert.match(tabs,/id:"Installed", title:"Installed"/);
});
