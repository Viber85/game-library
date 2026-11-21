import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  DEFAULT_LIBRARY_TABS,visibleLibraryTabs,gamesForLibraryTab,
  moveLibraryTab,changeLibraryTab,newLibraryTab
} from "../src/libraryTabs.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const backend=read("main.py"),dashboard=read("src/Dashboard.tsx");
const auto=read("src/autoTabSource.ts"),manager=read("src/TabManager.tsx");

const game=(id,installed,nonSteam,favorite=false)=>({
  id,title:"Test "+id,installed,nonSteam,favorite,lastPlayed:0,playtimeMinutes:0,
});
const games=[game(1,true,false),game(2,false,false),game(3,true,true),game(4,false,true,true)];

test("Owned tab model contains no TabMaster and all-games truly includes non-Steam",()=>{
  const source=read("src/libraryTabs.ts");
  assert.doesNotMatch(source,/TabMaster|Unifideck/);
  assert.deepEqual(DEFAULT_LIBRARY_TABS.map(t=>t.id),
    ["AllGames","Installed","Steam","NonSteam","Favorites"]);
  assert.deepEqual(gamesForLibraryTab(DEFAULT_LIBRARY_TABS[0],games).games.map(g=>g.id),
    [1,2,3,4]);
  assert.deepEqual(gamesForLibraryTab(DEFAULT_LIBRARY_TABS[1],games).games.map(g=>g.id),
    [1,3]);
  assert.deepEqual(gamesForLibraryTab(DEFAULT_LIBRARY_TABS[2],games).games.map(g=>g.id),
    [1,2]);
  assert.deepEqual(gamesForLibraryTab(DEFAULT_LIBRARY_TABS[3],games).games.map(g=>g.id),
    [3,4]);
  assert.deepEqual(gamesForLibraryTab(DEFAULT_LIBRARY_TABS[4],games).games.map(g=>g.id),
    [4]);
});

test("Custom rules, hidden tabs and reordering work without changing installed flags",()=>{
  const custom=newLibraryTab(DEFAULT_LIBRARY_TABS,"Backlog","not-installed","custom-backlog123");
  assert.deepEqual(gamesForLibraryTab(custom[5],games).games.map(g=>g.id),[2,4]);
  const moved=moveLibraryTab(custom,"custom-backlog123",-2);
  assert.equal(moved[3].id,"custom-backlog123");
  const hidden=changeLibraryTab(moved,"Steam",{visible:false});
  assert.ok(!visibleLibraryTabs(hidden).some(t=>t.id==="Steam"));
  assert.equal(visibleLibraryTabs(hidden)[3].id,"NonSteam");
  assert.equal(games[0].installed,true);
});

test("Backend owns tabs per Steam account and no longer reads peer settings",()=>{
  assert.match(backend,/async def get_library_tabs\(self, account_id: str = ""\)/);
  assert.match(backend,/async def save_library_tabs\(self, account_id: str, tabs: list\)/);
  assert.match(backend,/def _own_tab_validate\(tabs\)/);
  assert.match(backend,/saved\["tabs_by_user"\] = profiles/);
  assert.doesNotMatch(backend,/def _tabmaster_path|async def get_tabmaster_tabs/);
  assert.doesNotMatch(auto,/loadSteamTabs|tabmaster|TabMaster|Unifideck/);
  assert.match(auto,/const loadTabs=callable<\[string\],TabReply>\("get_library_tabs"\)/);
  assert.match(auto,/const persistTabs=callable<\[string,LibraryTab\[\]\],TabReply>\("save_library_tabs"\)/);
  assert.match(dashboard,/visibleLibraryTabs\(tabInfo.tabs/);
  assert.match(dashboard,/gamesForLibraryTab\(tab,games\)/);
  assert.match(dashboard,/<TabManager tabs=\{tabInfo.tabs\}/);
});

test("Manager handles creating, renaming, hiding, deleting, filter and navigation",()=>{
  assert.match(manager,/saveOwnTabs\(next\)/);
  assert.match(manager,/moveLibraryTab\(items,selected.id,-1\)/);
  assert.match(manager,/moveLibraryTab\(items,selected.id,1\)/);
  assert.match(manager,/changeLibraryTab\(items,selected.id,\{visible:!selected.visible\}\)/);
  assert.match(manager,/newLibraryTab\(items,title,filter,id\)/);
  assert.match(manager,/selected.kind!=="custom"/);
  assert.match(manager,/GamepadButton.DIR_DOWN/);
  assert.match(manager,/TextField aria-label="Tab name"/);
  assert.match(dashboard,/onActivate=\{\(\)=>\{setSortOpen\(false\);setTabManagerOpen\(true\);\}\}/);
  assert.match(dashboard,/const cycleTab = \(direction: number\)/);
});
