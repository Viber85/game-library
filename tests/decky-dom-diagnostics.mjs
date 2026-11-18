import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {THEME_DOM_SURVEY_SCRIPT,THEME_AUDIT_READ_SCRIPT,parseThemeDomEvidence,parseThemeAudit}
  from "../src/themeProbe.ts";

test("actual visible Steam CEF elements are sampled without guessing a Decky URL",()=>{
  const rail={tagName:"DIV",className:"gamepadpagedsettings_PagedSettingsDialog_PageListItem_123",
    getBoundingClientRect:()=>({width:230,height:43}),
    classList:{contains:()=>false}};
  const content={tagName:"DIV",className:"gamepaddialog_Field_456",
    getBoundingClientRect:()=>({width:620,height:55}),
    classList:{contains:()=>true}};
  const parent={className:"gamepaddialog_FieldContainer_ab"};
  rail.parentElement=parent;content.parentElement=parent;
  const document={
    querySelector:q=>q===".BasicUI,#GamepadUI_Full_Root"?{}:null,
    elementsFromPoint:(x)=>x<500?[rail]:[content]
  };
  const window={innerWidth:1000,innerHeight:720,location:{pathname:"/gamepadui",hash:""}};
  const result=vm.runInNewContext(THEME_DOM_SURVEY_SCRIPT,{
    document,window,Date,JSON,Array,Set,Math,
    getComputedStyle:el=>({backgroundColor:el===rail?
      "rgb(53, 66, 86)":"rgb(57, 74, 99)",backgroundImage:"none"})
  });
  const evidence=parseThemeDomEvidence(result);
  assert.ok(evidence);
  assert.equal(evidence.items.length,2);
  assert.equal(evidence.items[0].zone,"rail");
  assert.equal(evidence.items[1].zone,"content");
  assert.equal(evidence.items[1].color,"rgb(57, 74, 99)");
  assert.match(evidence.items[0].classes,/gamepadpagedsettings_PagedSettingsDialog/);
  assert.match(evidence.items[1].parent,/gamepaddialog_FieldContainer/);
  assert.equal(evidence.items[1].focused,true);
});

test("diagnostics are privacy-bounded and do not read user-facing text or personal data",()=>{
  assert.doesNotMatch(THEME_DOM_SURVEY_SCRIPT,/\.innerText|\.textContent|\.innerHTML|\.value\b|localStorage|sessionStorage|fetch\(|networkName|userName|ssid/i);
  assert.match(THEME_DOM_SURVEY_SCRIPT,/elementsFromPoint/);
  assert.match(THEME_DOM_SURVEY_SCRIPT,/getComputedStyle/);
  const injected=parseThemeDomEvidence({at:Date.now(),items:[
    {zone:"rail",classes:"_abc",parent:"_",color:"rgb(10, 20, 30)"},
    {zone:"content",classes:"<script>",parent:"abc",color:"rgb(53, 66, 86)"}
  ]});
  assert.equal(injected,null);
  assert.equal(parseThemeDomEvidence({items:[]}),null);
});

test("CEF watcher snapshots are retained in memory and available without restarting CSS",()=>{
  assert.match(THEME_AUDIT_READ_SCRIPT,/recentDomEvidence/);
  const page=readFileSync(new URL("../src/BuiltinThemePanel.tsx",import.meta.url),"utf8");
  assert.match(page,/Read CEF diagnostics \(no reload\)/);
  assert.doesNotMatch(page,/refreshBuiltinTheme\(\)\.then\(\(\)=>runThemeDiagnostics\(\)\)/);
  const recent=[{at:Date.now(),items:[
    {zone:"rail",classes:"_steamNav",parent:"_left",color:"rgb(31, 42, 63)"},
    {zone:"content",classes:"_steamField",parent:"_right",color:"rgb(39, 55, 82)"}
  ]}];
  const result=parseThemeAudit({installed:true,sampleTicks:2,
    recentDomEvidence:recent,latestSettings:null,latestGame:null,latestOther:null});
  assert.equal(result?.recentDomEvidence.length,1);
  assert.equal(result?.recentDomEvidence[0].items[1].color,"rgb(39, 55, 82)");
});
