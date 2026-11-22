import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  DEFAULT_LIBRARY_TABS,visibleLibraryTabs,gamesForLibraryTab,
  moveLibraryTab,changeLibraryTab,newLibraryTab,assignManualGames,
  smartRulesForTab,assignSmartExceptions
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
    ["AllGames","Installed","Steam","NonSteam","GOG","Favorites"]);
  assert.deepEqual(gamesForLibraryTab(DEFAULT_LIBRARY_TABS[0],games).games.map(g=>g.id),
    [1,2,3,4]);
  assert.deepEqual(gamesForLibraryTab(DEFAULT_LIBRARY_TABS[1],games).games.map(g=>g.id),
    [1,3]);
  assert.deepEqual(gamesForLibraryTab(DEFAULT_LIBRARY_TABS[2],games).games.map(g=>g.id),
    [1,2]);
  assert.deepEqual(gamesForLibraryTab(DEFAULT_LIBRARY_TABS[3],games).games.map(g=>g.id),
    [3,4]);
  assert.deepEqual(gamesForLibraryTab(DEFAULT_LIBRARY_TABS[5],games).games.map(g=>g.id),
    [4]);
});

test("Custom rules, hidden tabs and reordering work without changing installed flags",()=>{
  const custom=newLibraryTab(DEFAULT_LIBRARY_TABS,"Backlog","not-installed","custom-backlog123");
  assert.deepEqual(gamesForLibraryTab(custom[6],games).games.map(g=>g.id),[2,4]);
  const moved=moveLibraryTab(custom,"custom-backlog123",-2);
  assert.equal(moved[4].id,"custom-backlog123");
  const hidden=changeLibraryTab(moved,"Steam",{visible:false});
  assert.ok(!visibleLibraryTabs(hidden).some(t=>t.id==="Steam"));
  assert.equal(visibleLibraryTabs(hidden)[2].id,"NonSteam");
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
  assert.match(manager,/newLibraryTab\(items,title,filter,id,createMode\)/);
  assert.match(manager,/selected.kind!=="custom"/);
  assert.match(manager,/GamepadButton.DIR_DOWN/);
  assert.match(manager,/focusSpatially\(editorRegionRef\.current,current,direction/);
  assert.match(manager,/b===GamepadButton\.DIR_LEFT\?"left"/);
  assert.match(manager,/b===GamepadButton\.DIR_RIGHT\?"right"/);
  assert.match(manager,/b===GamepadButton\.DIR_UP\?"up"/);
  assert.match(manager,/b===GamepadButton\.DIR_DOWN\?"down"/);
  assert.match(manager,/onButtonDown=\{pickerDpad\}/);
  assert.match(manager,/onButtonDown=\{editorDpad\}/);
  assert.match(manager,/onKeyDownCapture=\{editorTextKeyDown\}/);
  assert.match(manager,/TextField aria-label="Tab name"/);
  assert.match(dashboard,/<TabManager tabs=\{tabInfo.tabs\} games=\{games\}/);
  assert.doesNotMatch(dashboard,/gl-manage-tabs-trigger|setTabManagerOpen/);
  assert.match(read("src/PluginSettingsPage.tsx"),/Navigation.Navigate\("\/game-library\/tabs"\)/);
  assert.match(dashboard,/const cycleTab = \(direction: number\)/);
});

test("Manual tabs persist selected app IDs and leave native library untouched",()=>{
  const manual=newLibraryTab(DEFAULT_LIBRARY_TABS,"My RPG","all","custom-my-rpg1","manual");
  assert.equal(manual[6].mode,"manual");
  assert.deepEqual(gamesForLibraryTab(manual[6],games).games,[]);
  const selected=assignManualGames(manual,manual[6].id,[4,2,4,999]);
  assert.deepEqual(selected[6].members,[2,4,999]);
  assert.deepEqual(gamesForLibraryTab(selected[6],games).games.map(g=>g.id),[2,4]);
  assert.deepEqual(gamesForLibraryTab(DEFAULT_LIBRARY_TABS[0],games).games.map(g=>g.id),
    [1,2,3,4]);
  assert.match(read("src/TabManager.tsx"),/Find games for manual tab/);
  assert.match(read("src/TabManager.tsx"),/Save selection/);
  assert.match(read("src/TabManager.tsx"),/Selected only/);
});

test("Manual selection and Tab Manager are accessed from Plugin Settings, with Appearance in the rail",()=>{
  const index=read("src/index.tsx");
  assert.match(index,/routerHook.addRoute\(TABS_ROUTE/);
  assert.match(index,/routerHook.addRoute\(PLUGIN_SETTINGS_ROUTE/);
  assert.match(index,/routerHook.removeRoute\(TABS_ROUTE\)/);
  assert.match(index,/routerHook.removeRoute\(PLUGIN_SETTINGS_ROUTE\)/);
  assert.doesNotMatch(dashboard,/\{ id: "tabs", label: "Tab Manager"/);
  assert.match(dashboard,/id: "appearance", label: "Appearance"/);
  assert.match(dashboard,/onClose=\{\(\)=>Navigation.Navigate\(PLUGIN_SETTINGS_ROUTE\)\}/);
  assert.match(dashboard,/id: "settings", label: "Settings"/);
  assert.match(dashboard,/<PluginSettingsPage firstRef=\{settingsEntryRef\}/);
  const pluginSettings=read("src/PluginSettingsPage.tsx");
  assert.match(pluginSettings,/Use as Steam Home/);
  assert.match(pluginSettings,/<strong>Tab Manager<\/strong>/);
  assert.match(pluginSettings,/Navigation.Navigate\("\/game-library\/tabs"\)/);
  assert.doesNotMatch(pluginSettings,/<strong>Appearance & artwork<\/strong>/);
  assert.doesNotMatch(pluginSettings,/Navigation.Navigate\("\/game-library\/appearance"\)/);
  assert.match(pluginSettings,/restoreTabManagerFocus\?1:0/);
  assert.match(read("src/PluginSettingsPage.tsx"),/notifyHomeSetting\(value\)/);
});

test("Smart AND/OR evaluates separate conditions, with no false game matches",()=>{
  const smart=newLibraryTab(DEFAULT_LIBRARY_TABS,"Steam installed","all",
    "custom-steam-installed","smart")[6];
  const tab={...smart,rules:[{type:"steam"},{type:"installed"}],ruleJoin:"all"};
  assert.deepEqual(gamesForLibraryTab(tab,games).games.map(g=>g.id),[1]);
  assert.deepEqual(gamesForLibraryTab({...tab,ruleJoin:"any"},games).games.map(g=>g.id),
    [1,2,3]);
  assert.deepEqual(gamesForLibraryTab({...tab,rules:[],ruleJoin:"all"},games).games.map(g=>g.id),
    [1,2,3,4]);
  assert.deepEqual(gamesForLibraryTab({...tab,rules:[{type:"not-favorites"}]},games)
    .games.map(g=>g.id),[1,2,3]);
  assert.deepEqual(gamesForLibraryTab({...tab,rules:[{type:"played"}]},games).games,[]);
  assert.deepEqual(gamesForLibraryTab({...tab,rules:[{type:"played"}]},
    [...games,{...game(5,false,true),lastPlayed:1700000000,playtimeMinutes:0}])
    .games.map(g=>g.id),[5]);
  const legacy={...smart,filter:"not-installed",rules:undefined};
  assert.deepEqual(smartRulesForTab(legacy),[{type:"not-installed"}]);
  assert.deepEqual(gamesForLibraryTab(legacy,games).games.map(g=>g.id),[2,4]);
});

test("Smart exceptions override AND/OR, do not modify Manual or built-ins",()=>{
  const smart=newLibraryTab(DEFAULT_LIBRARY_TABS,"Steam installed","all",
    "custom-steam-installed","smart");
  const id=smart[6].id;
  const withRules=changeLibraryTab(smart,id,{
    rules:[{type:"steam"},{type:"installed"}],ruleJoin:"all"
  });
  const included=assignSmartExceptions(withRules,id,"include",[4,4,2]);
  assert.deepEqual(included[6].forceInclude,[2,4]);
  const excluded=assignSmartExceptions(included,id,"exclude",[4,1]);
  assert.deepEqual(excluded[6].forceInclude,[2]);
  assert.deepEqual(excluded[6].forceExclude,[1,4]);
  assert.deepEqual(gamesForLibraryTab(excluded[6],games).games.map(g=>g.id),[2]);
  assert.equal(gamesForLibraryTab(DEFAULT_LIBRARY_TABS[0],games).games.length,4);
  const manual=newLibraryTab(DEFAULT_LIBRARY_TABS,"Manual","all","custom-manualtest","manual");
  const untouched=assignSmartExceptions(manual,manual[6].id,"include",[1]);
  assert.deepEqual(untouched[6].forceInclude,[]);
});

test("Smart editor is reachable from Settings Tab Manager with live preview",()=>{
  const manager=read("src/TabManager.tsx");
  const editor=read("src/SmartTabEditor.tsx");
  assert.match(manager,/Edit Smart Rules/);
  assert.match(manager,/Always Include/);
  assert.match(manager,/Always Exclude/);
  assert.match(manager,/assignSmartExceptions\(items,selected.id,pickerTarget,pickerSelected\)/);
  assert.match(manager,/<SmartTabEditor tab=\{selected\} games=\{games\}/);
  assert.match(editor,/gamesForLibraryTab\(\{\.\.\.tab,mode:"smart",rules,ruleJoin:join\},games\)/);
  assert.match(editor,/ALL · AND/);
  assert.match(editor,/ANY · OR/);
  assert.match(editor,/Save Rules/);
  assert.doesNotMatch(editor,/TabMaster|Unifideck/);
});

test("Appearance and Settings keep independently navigable theme and provider tools",()=>{
  const appearance=read("src/AppearancePage.tsx");
  const settings=read("src/PluginSettingsPage.tsx");
  assert.match(appearance,/Theme Hub/);
  assert.match(appearance,/Color Editor/);
  assert.doesNotMatch(appearance,/SteamGridDBPanel|UpdatesPanel/);
  assert.match(settings,/<SteamGridDBPanel\/>/);
  assert.match(settings,/<GogIntegrationPanel\/>/);
  assert.match(settings,/<UpdatesPanel\/>/);
  assert.match(settings,/openTool\("steamgriddb"\)/);
  assert.match(settings,/openTool\("updates"\)/);
  assert.match(settings,/GENERAL_ROWS=6/);
  assert.match(settings,/focus\(toolLastIndex\)/);
});
