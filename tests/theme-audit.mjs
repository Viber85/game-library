import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
  THEME_AUDIT_INSTALL_SCRIPT,
  THEME_AUDIT_READ_SCRIPT,
  THEME_AUDIT_REMOVE_SCRIPT,
  parseThemeAudit,latestThemePage,
} from "../src/themeProbe.ts";

function createSteamPage(initial="settings") {
  let mode=initial;
  let tick=()=>{};
  let removed=0;
  const row={className:"gamepaddialog_Field_S-_La",querySelectorAll:()=>[]};
  const settings={className:"gamepadpagedsettings_PagedSettingsDialog_PageContent_wIOLO",
    querySelectorAll:()=>[row]};
  const game={className:"appdetails_Container_abc",querySelectorAll:()=>[row]};
  const surface={className:"BasicUI"};
  const document={
    documentElement:{},
    body:surface,
    querySelector:(query)=>{
      if(query===".BasicUI" || query.includes("#GamepadUI_Full_Root"))return surface;
      if(mode==="settings"&&query.includes("gamepadpagedsettings_") &&
          query.includes("gamepaddialog_Field"))return row;
      if(mode==="settings"&&query.includes("gamepadpagedsettings_"))return settings;
      if(mode==="settings"&&query.includes("gamepaddialog_Field"))return row;
      if(mode==="game"&&query.includes("appdetails_"))return game;
      return null;
    },
    querySelectorAll:(query)=>{
      if(query==="style")return [{textContent:"--game-library-midnight-active: 42;"}];
      if(mode==="settings"&&query.includes("gamepadpagedsettings_PagedSettingsDialog_PageContent"))return [settings];
      if(mode==="settings"&&query.includes("gamepaddialog_Field"))return [row,row,row];
      if(mode==="game"&&query.includes("appdetails_Container"))return [game];
      if(mode==="game"&&query.includes("appdetailssection_"))return [row,row];
      return [];
    },
  };
  const win={};
  const context={window:win,document,
    getComputedStyle:(target)=>({
      backgroundColor:target===row?"rgb(16, 39, 63)":"rgb(2, 8, 21)",
      getPropertyValue:()=> "42",
    }),
    setInterval:(cb)=>{tick=cb;return 123;},
    clearInterval:(id)=>{if(id===123)removed++;},
    Date,JSON,Set,Array,Boolean,String,
  };
  return {
    run:(script)=>vm.runInNewContext(script,context),
    mode:(next)=>{mode=next;},
    tick:()=>tick(),
    removed:()=>removed,
  };
}

test("captures native Settings CSS before opening the Decky QAM overlay",()=>{
  const page=createSteamPage("settings");
  assert.equal(page.run(THEME_AUDIT_INSTALL_SCRIPT),true);
  page.mode("qam");
  page.tick(); // simulate Steam unmounting the Settings DOM
  const audit=parseThemeAudit(page.run(THEME_AUDIT_READ_SCRIPT));
  assert.equal(audit?.installed,true);
  const saved=latestThemePage(audit,Date.now());
  assert.equal(saved?.kind,"Settings");
  assert.equal(saved?.sample.probe.settingsRoots,1);
  assert.equal(saved?.sample.probe.fieldRows,3);
  assert.equal(saved?.sample.probe.fieldColor,"rgb(16, 39, 63)");
  assert.equal(page.run(THEME_AUDIT_REMOVE_SCRIPT),true);
  assert.equal(page.removed(),1);
  const after=parseThemeAudit(page.run(THEME_AUDIT_READ_SCRIPT));
  assert.equal(after?.installed,false);
  assert.equal(after?.latestSettings,null);
});

test("captures native game-details surface and retains only latest nonempty snapshot",()=>{
  const page=createSteamPage("game");
  page.run(THEME_AUDIT_INSTALL_SCRIPT);
  page.mode("qam");
  page.tick();
  const saved=latestThemePage(parseThemeAudit(page.run(THEME_AUDIT_READ_SCRIPT)),Date.now());
  assert.equal(saved?.kind,"Game Details");
  assert.equal(saved?.sample.probe.gameRoots,1);
  assert.equal(saved?.sample.probe.gameSections,2);
});

test("repeated theme checks don't install multiple background CSS watchers",()=>{
  const page=createSteamPage("settings");
  assert.equal(page.run(THEME_AUDIT_INSTALL_SCRIPT),true);
  assert.equal(page.run(THEME_AUDIT_INSTALL_SCRIPT),true);
  assert.equal(page.removed(),0);
  page.run(THEME_AUDIT_REMOVE_SCRIPT);
  assert.equal(page.removed(),1);
});

test("old snapshots are not treated as current after 3 minutes",()=>{
  const old={installed:true,latestSettings:{
    at:Date.now()-240000,
    probe:{visibleUI:true,settingsRoots:1,fieldRows:9}
  },latestGame:null};
  assert.equal(latestThemePage(parseThemeAudit(old),Date.now()),null);
  assert.equal(parseThemeAudit("garbage"),null);
  assert.equal(parseThemeAudit({installed:true,latestSettings:{at:"old",probe:{}}})?.latestSettings,null);
});

test("CSS watcher doesn't store personal data or persist snapshots",()=>{
  assert.doesNotMatch(THEME_AUDIT_INSTALL_SCRIPT,/localStorage|sessionStorage|IndexedDB|fetch\(|\.innerText|\.innerHTML|ssid|networkName|gameTitle/i);
  assert.match(THEME_AUDIT_INSTALL_SCRIPT,/setInterval/);
  assert.match(THEME_AUDIT_REMOVE_SCRIPT,/clearInterval/);
});
