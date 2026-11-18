import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {THEME_PROBE_SCRIPT,parseThemeProbe} from "../src/themeProbe.ts";

const css=readFileSync(new URL("../system-theme/decky-settings.css",import.meta.url),"utf8");
const live=css.slice(css.indexOf("/* v0.4.21-test.18"),css.indexOf("/* test.19 — stable left rail"));

test("Actual Claw DOM activates preloaded CSS, not the unavailable Decky router URL",()=>{
  assert.ok(live.length>1900,"Missing test.18 native CSS block");
  const signature="html:has(.BasicUI .PageListColumn):has(.BasicUI .DialogControlsSection)";
  assert.ok(live.includes(signature));
  assert.ok(live.includes(".Panel:has(> .PageListColumn)"),"Observed rail parent is its own Panel");
  assert.ok(live.includes(".Panel:has(.DialogControlsSection)"),"Right content has a separate Panel");
  assert.ok(live.includes('[class*="eKmEXJCm_"]'),"Observed gray Field class token");
  assert.ok(live.includes("--glm-decky-observed-layout:1"),"CSS activation proof");
  assert.doesNotMatch(live.replace(/\/\*[\s\S]*?\*\//g,""),/data-glm-decky-settings|window\.location|\/decky\/settings/,
    "Actual CSS must not wait on a route marker");
  for(const color of ["#081425","#0a1b30","#0f2842","#163a5e","#123452","#1d527d"])
    assert.ok(live.includes(color),"Missing requested Midnight color "+color);
  assert.doesNotMatch(live,/box-shadow:\s*inset|border:\s*\d+px/);
  for(const [,selector,declarations] of live.replace(/\/\*[\s\S]*?\*\//g,"")
    .matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    assert.ok(selector.includes(signature),"Every native CSS selector must use the real Decky DOM");
    assert.doesNotMatch(declarations,/\b(width|height|margin|padding|position|transform|pointer-events|display|overflow|z-index)\s*:/,
      "No native UI geometry or hitbox changes");
  }
});

test("Real Decky DOM and CSS are detected even if browser location never changes",()=>{
  const railPanel={};
  const rail={closest:q=>q===".Panel"?railPanel:null};
  const body={},content={},field={};
  const root={querySelectorAll:()=>[]};
  const document={
    documentElement:{hasAttribute:()=>false},
    body:root,
    querySelector:q=>{
      if(q===".BasicUI .PageListColumn")return rail;
      if(q===".BasicUI .DialogControlsSection")return body;
      if(q===".BasicUI .DialogContent")return content;
      if(q.includes('eKmEXJCm_'))return field;
      if(q.includes(".BasicUI"))return root;
      return null;
    },
    querySelectorAll:q=>q==="style"?[{textContent:"--game-library-midnight-active: 70;"}]:
      q.includes("eKmEXJCm_")?[field]:[],
  };
  const data=vm.runInNewContext(THEME_PROBE_SCRIPT,{
    document,window:{location:{pathname:"/gamepadui",hash:""}},
    getComputedStyle:el=>({
      backgroundColor:"rgb(15, 40, 66)",backgroundImage:"none",
      getPropertyValue:k=>k==="--glm-decky-observed-layout"&&el===railPanel?"1":"70"
    }),
    Math,Date,JSON,Array,Map,Set,Boolean,String,Number
  });
  const info=parseThemeProbe(data);
  assert.equal(info?.deckyObservedDom,true);
  assert.equal(info?.deckySettingsActive,true);
  assert.equal(info?.deckyLiveCssMatched,true);
  assert.equal(info?.deckyFieldRows,1);
  assert.equal(info?.deckyFieldColor,"rgb(15, 40, 66)");
});

test("Decky left rail stays navy when right pane unmounts between tabs",()=>{
  const selector=".BasicUI .Panel:has(> .PageListColumn)";
  const stable=css.slice(css.indexOf("/* test.19 — stable left rail")).replace(/\/\*[\s\S]*?\*\//g,"");
  assert.ok(stable.includes(selector),"Always match the mounted rail, not right pane");
  assert.ok(stable.includes("> .PageListColumn"));
  assert.ok(stable.includes("background:#081425 !important"));
  assert.ok(stable.includes("transition:none !important"));
  assert.ok(stable.includes("animation:none !important"));
  assert.doesNotMatch(stable,/DialogControlsSection|data-glm-decky-settings|\/decky\/settings/,
    "Rail fallback must not depend on right-side DOM, marker or URL");
  assert.doesNotMatch(stable,/\b(?:width|height|padding|margin|position|display|overflow|pointer-events|transform|z-index)\s*:/);
});
