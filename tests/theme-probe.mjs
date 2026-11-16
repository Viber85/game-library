import assert from "node:assert/strict";
import test from "node:test";
import {parseThemeProbe,STEAM_PAGE_CHECK_SCRIPT,THEME_PROBE_SCRIPT}
  from "../src/themeProbe.ts";

test("Steam theme probe only inspects CSS classes and computed color",()=>{
  assert.match(STEAM_PAGE_CHECK_SCRIPT,/document\.querySelector/);
  assert.match(THEME_PROBE_SCRIPT,/getComputedStyle/);
  assert.match(THEME_PROBE_SCRIPT,/gamepadpagedsettings_PagedSettingsDialog_PageContent/);
  assert.match(THEME_PROBE_SCRIPT,/appdetailsnotessection/);
  assert.doesNotMatch(THEME_PROBE_SCRIPT,/\.innerText|\.textContent\s*\)|localStorage|\.value\b|networkName|ssid/i);
});

test("parses real Steam marker and fields into numeric diagnostics",()=>{
  const r=parseThemeProbe(JSON.stringify({
    visibleUI:true,marker:"42",sheets:1,settingsRoots:1,fieldRows:12,
    networkRows:8,gameRoots:0,gameSections:0,fieldColor:"rgb(16, 39, 63)",
    rootColor:"rgb(2, 8, 21)",sampleClasses:["gamepaddialog_Field_S-_La"]
  }));
  assert.equal(r?.visibleUI,true);
  assert.equal(r?.settingsRoots,1);
  assert.equal(r?.fieldRows,12);
  assert.equal(r?.networkRows,8);
  assert.equal(r?.marker,"42");
  assert.equal(r?.fieldColor,"rgb(16, 39, 63)");
});

test("bad CEF results cannot produce a false successful marker",()=>{
  assert.equal(parseThemeProbe("<html>unexpected response"),null);
  assert.equal(parseThemeProbe(null),null);
  const p=parseThemeProbe({visibleUI:false,marker:123,sheets:"foo",fieldRows:-20});
  assert.equal(p?.marker,"");
  assert.equal(p?.sheets,0);
  assert.equal(p?.fieldRows,0);
});

test("untrusted class samples are bounded and do not include user values",()=>{
  const p=parseThemeProbe({
    sampleClasses:Array.from({length:20},(_,i)=>"A".repeat(200)+i),
  });
  assert.equal(p?.sampleClasses.length,8);
  assert.ok(p.sampleClasses.every(v=>v.length<=90));
});
