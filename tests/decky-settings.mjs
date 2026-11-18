import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {STEAM_SETTINGS_MARK_SCRIPT,THEME_AUDIT_INSTALL_SCRIPT,THEME_AUDIT_REMOVE_SCRIPT}
 from "../src/themeProbe.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("system-theme/decky-settings.css").replace(/\/\*[\s\S]*?\*\//g,"");
const main=read("main.py");

test("Decky page has isolated Midnight palette with no geometry changes",()=>{
  for(const s of ["data-glm-decky-settings","data-glm-settings-main",
    "data-glm-settings-sidebar","data-glm-settings-navitem",
    "data-glm-settings-row","data-glm-settings-special-row",
    "gamepaddialog_Field","reorderablelist_Entry","DialogButton"])
    assert.ok(css.includes(s),"Missing Decky element "+s);
  for(const c of ["#0a1b30","#081425","#0f2842","#163a5e","#123452","#1d527d"])
    assert.ok(css.includes(c),"Missing Midnight palette entry "+c);
  for(const [,selector,decl] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    assert.match(selector,/html\[data-glm-decky-settings\]/);
    assert.doesNotMatch(decl,/\b(?:width|height|padding|margin|position|display|visibility|pointer-events|overflow|transform|z-index)\s*:/);
  }
  assert.doesNotMatch(css,/box-shadow:inset|border:[0-9]+px/);
});

test("Decky stylesheet loads once in main and a pre-paint observer marks its route",()=>{
  const mainScope=main.slice(main.indexOf('"main": ('),main.indexOf('"overlay": ('));
  const overlay=main.slice(main.indexOf('"overlay": ('),main.indexOf('    result = {}'));
  assert.ok(mainScope.includes('"decky-settings.css"'));
  assert.ok(!overlay.includes('"decky-settings.css"'));
  assert.ok(mainScope.indexOf('"decky-settings.css"')>mainScope.indexOf('"settings-focus.css"'));
  assert.match(STEAM_SETTINGS_MARK_SCRIPT,/if\(deckySettings\)mark\(document.documentElement,'data-glm-decky-settings'\)/);
  assert.match(STEAM_SETTINGS_MARK_SCRIPT,/nav\.length===4/);
  assert.match(THEME_AUDIT_INSTALL_SCRIPT,/new MutationObserver/);
  assert.match(THEME_AUDIT_INSTALL_SCRIPT,/attributeFilter:\['class','style','aria-selected','aria-checked'\]/);
  assert.match(THEME_AUDIT_REMOVE_SCRIPT,/data-glm-decky-settings/);
});

test("A four-tab Decky Settings page is recognized before paint, and unmarked on exit",()=>{
  const box=(x,y,w,h)=>({left:x,top:y,width:w,height:h,right:x+w,bottom:y+h});
  const nodes=[];
  const el=(x,y,w,h)=>{
    const attrs=new Map();
    const entry={
      tagName:"DIV",className:"decky",parentElement:null,children:[],
      getBoundingClientRect:()=>box(x,y,w,h),
      getAttribute:k=>attrs.get(k)??null,
      setAttribute:(k,v)=>attrs.set(k,String(v)),
      removeAttribute:k=>attrs.delete(k),
      hasAttribute:k=>attrs.has(k),
      querySelector:()=>null,querySelectorAll:()=>[],
    };
    nodes.push(entry);return entry;
  };
  const html=el(0,0,1000,760);
  const root=el(0,0,1000,760);root.className="BasicUI";
  const left=el(30,40,240,690);left.parentElement=root;
  const right=el(300,40,680,690);right.parentElement=root;
  const tabs=Array.from({length:4},(_,i)=>{
    const n=el(45,90+i*65,205,45);n.parentElement=left;return n;
  });
  const rows=Array.from({length:6},(_,i)=>{
    const n=el(315,175+i*75,620,50);n.parentElement=right;return n;
  });
  right.querySelectorAll=()=>rows;
  let showing=true;
  const document={
    documentElement:html,
    querySelector:q=>q===".BasicUI"?root:null,
    querySelectorAll:q=>q.includes("data-glm-")?
      nodes.filter(n=>q.split(",").some(item=>{
        const match=item.match(/\[([^\]]+)\]/);
        return match&&n.hasAttribute(match[1]);
      })):[],
    elementsFromPoint:(x,y)=>{
      if(!showing)return [];
      return (x<250?tabs:rows).filter(n=>{
        const b=n.getBoundingClientRect();
        return y>=b.top&&y<b.bottom;
      });
    },
  };
  const win={innerWidth:1000,innerHeight:760,
    location:{pathname:"/decky/settings/general",hash:""}};
  const run=()=>vm.runInNewContext(STEAM_SETTINGS_MARK_SCRIPT,{
    document,window:win,Math,Array,Map,Set,String,Boolean,
    getComputedStyle:()=>({backgroundColor:"rgb(56,70,98)",backgroundImage:"none"}),
  });
  assert.equal(run(),true);
  assert.equal(html.hasAttribute("data-glm-decky-settings"),true);
  assert.equal(right.hasAttribute("data-glm-settings-main"),true);
  assert.equal(left.hasAttribute("data-glm-settings-sidebar"),true);
  assert.equal(tabs.filter(x=>x.hasAttribute("data-glm-settings-navitem")).length,4);
  win.location.pathname="/decky/settings/plugins";
  assert.equal(run(),true,"Switching Decky tabs retains the theme without waiting");
  assert.equal(html.hasAttribute("data-glm-decky-settings"),true);
  showing=false;win.location.pathname="/library/home";
  assert.equal(run(),false);
  assert.equal(html.hasAttribute("data-glm-decky-settings"),false,
    "Decky-only palette must not leak outside the settings screen");
});
