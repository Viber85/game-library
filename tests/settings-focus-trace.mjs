import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {
  THEME_FOCUS_TRACE_SCRIPT,parseThemeFocusFrame
} from "../src/themeFocusTrace.ts";
import {
  THEME_AUDIT_INSTALL_SCRIPT,THEME_AUDIT_READ_SCRIPT,THEME_AUDIT_REMOVE_SCRIPT
} from "../src/themeProbe.ts";

test("Read real focused nav row and its ::before/::after paint in one frame",()=>{
  const rail={
    tagName:"DIV",className:"PageListColumn",parentElement:null,
    classList:{contains:()=>false},
    contains:e=>e===rail||e===active,
    querySelector:()=>active,querySelectorAll:()=>[active],
    getBoundingClientRect:()=>({left:10,top:20,width:240,height:680})
  };
  const active={
    tagName:"DIV",className:"Focusable gpfocus",
    parentElement:rail,firstElementChild:null,
    classList:{contains:c=>c==="gpfocus"},
    getBoundingClientRect:()=>({left:15,top:90,width:220,height:46})
  };
  const document={
    querySelectorAll:()=>[rail],activeElement:active,
    elementsFromPoint:()=>[active,rail]
  };
  const data=vm.runInNewContext(THEME_FOCUS_TRACE_SCRIPT,{
    document,Date,JSON,Set,Array,
    getComputedStyle:(e,pseudo)=>{
      const before=pseudo==="::before",after=pseudo==="::after";
      return {backgroundColor:before?"rgb(48, 150, 245)":
          after?"rgba(0, 0, 0, 0)":e===rail?"rgb(8, 20, 37)":"rgb(22, 58, 94)",
        backgroundImage:"none",boxShadow:before?"0 0 8px blue":"none",
        transitionDuration:before?".12s":"0s",animationName:"none"};
    }
  });
  const entry=JSON.parse(data);
  entry.reason="mutation";
  const frame=parseThemeFocusFrame(entry);
  assert.ok(frame);
  assert.equal(frame.reason,"mutation");
  assert.ok(frame.items.some(x=>x.layer==="before"&&x.bg==="rgb(48, 150, 245)"),
    "Record the bright Steam blue pseudo-layer that may explain the flash");
  assert.ok(frame.items.some(x=>x.cls.includes("gpfocus")&&x.bg==="rgb(22, 58, 94)"));
  assert.ok(frame.items.some(x=>x.role==="rail"&&x.bg==="rgb(8, 20, 37)"));
  assert.ok(frame.items.some(x=>x.shadow==="present"));
  assert.ok(frame.items.some(x=>x.transition===".12s"));
});

test("Trace is bounded, privacy-safe, parsed and not persisted",()=>{
  assert.doesNotMatch(THEME_FOCUS_TRACE_SCRIPT,
    /\.textContent|\.innerText|\.innerHTML|\.value\b|localStorage|sessionStorage|fetch\(|ssid|networkName|username|gameTitle/i);
  assert.match(THEME_FOCUS_TRACE_SCRIPT,/getComputedStyle\(element,layer==='self'\?null:'::'\+layer\)/);
  assert.match(THEME_FOCUS_TRACE_SCRIPT,/elementsFromPoint/);
  assert.equal(parseThemeFocusFrame({at:Date.now(),reason:"focusin",items:[
    {role:"focus",layer:"self",cls:"a",bg:"rgb(8, 20, 37)",
      image:"none",shadow:"none",transition:"0s",animation:"none"}]}),null,
    "One ambiguous layer does not establish a useful focus trace");
  assert.equal(parseThemeFocusFrame({at:Date.now(),reason:"focusin",items:[
    {role:"rail",layer:"self",cls:"<script>",bg:"rgb(8, 20, 37)",
      image:"none",shadow:"none",transition:"0s",animation:"none"},
    {role:"focus",layer:"before",cls:"foo",bg:"rgb(2, 3, 4)",
      image:"none",shadow:"none",transition:"0s",animation:"none"}]}),null);
});

test("CEF watcher collects controller focus mutations plus subsequent animation frames",()=>{
  for(const entry of ["focusTrace:[]","document.addEventListener?.('focusin'",
    "document.addEventListener?.('focusout'",
    "entry.type==='attributes'","belongsToSettingsRail(entry.target)",
    "state.focusFrameId=requestAnimationFrame(nextFocusFrame)",
    "remainingFocusFrames=5","state.focusTrace=[next,...state.focusTrace].slice(0,28)"])
    assert.ok(THEME_AUDIT_INSTALL_SCRIPT.includes(entry),"Missing focus trace hook "+entry);
  assert.match(THEME_AUDIT_INSTALL_SCRIPT,/attributeFilter:\['class','style','aria-selected','aria-checked'\]/);
  assert.match(THEME_AUDIT_READ_SCRIPT,/focusTrace:state\?\.focusTrace/);
  assert.match(THEME_AUDIT_REMOVE_SCRIPT,/removeEventListener\?\.\('focusin'/);
  assert.match(THEME_AUDIT_REMOVE_SCRIPT,/cancelAnimationFrame\(state\.focusFrameId\)/);
  const panel=readFileSync(new URL("../src/BuiltinThemePanel.tsx",import.meta.url),"utf8");
  assert.match(panel,/Copy gamepad focus transition trace/);
  assert.match(panel,/Read CEF diagnostics \(no reload\)/);
  assert.doesNotMatch(panel,/refreshBuiltinTheme\(\)\.then/);
});
