import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {STEAM_SETTINGS_MARK_SCRIPT,THEME_AUDIT_INSTALL_SCRIPT,THEME_AUDIT_REMOVE_SCRIPT}
  from "../src/themeProbe.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("system-theme/settings-special.css").replace(/\/\*[\s\S]*?\*\//g,"");
const bundle=read("main.py");

test("Midnight rows now have no brittle route gate and no-outline blue focus",()=>{
  assert.match(css,/html\[data-glm-settings-root\]/);
  assert.match(css,/data-glm-settings-main/);
  assert.match(css,/data-glm-settings-special-row/);
  assert.doesNotMatch(css,/data-glm-settings-page/,
    "The old route-specific CSS gate is the primary reason all three screens stayed gray");
  assert.match(css,/background:#0f2842 !important;/,"Dark navy idle card");
  assert.match(css,/background:#163a5e !important;/,"Lighter blue selected card");
  assert.match(css,/animation-name:none !important;/,
    "Prevent native Steam focus animation repainting gray over blue");
  assert.match(css,/gamepaddialog_Field/,"Fallback for readable/minified native Field module");
  assert.match(css,/:not\(:has\(/,"Interactive toggles and sliders must remain unchanged");
  assert.match(css,/\[role="radio"\]/,"Keyboard layout rows included");
  assert.doesNotMatch(css,/#QuickAccess-Menu|#GamepadUI_Full_Root|\.BasicUIContextMenu/);
  for(const [,selector,decl] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    assert.match(selector,/data-glm-settings-root|gamepadpagedsettings_PagedSettingsDialog_PageContent/,
      "Every rule must be scoped to the Steam Settings page");
    assert.doesNotMatch(decl,/\b(?:width|height|margin|padding|transform|position|display|visibility|pointer-events|z-index|overflow|border-width|border-style|filter|opacity)\s*:/,
      "Never change Steam geometry, controls, artwork, or input");
  }
  assert.doesNotMatch(css,/box-shadow:inset|border:[0-9]+px/,"No glow or focus outline");
});

test("Visual watcher finds broad painted gray surfaces with no route or role",()=>{
  const source=STEAM_SETTINGS_MARK_SCRIPT;
  for(const needle of [
    "mainPane?.querySelectorAll","graySurface","data-glm-settings-special-row",
    "data-glm-settings-special-part","getComputedStyle",
    "getBoundingClientRect","hasControl"
  ])assert.ok(source.includes(needle),needle);
  assert.match(source,/\[class\],\[role="button"\],\[role="radio"\]/);
  assert.match(source,/const oldSpecial=new Set\(/,
    "Do not drop a painted row after its computed color turns navy");
  assert.match(source,/oldSpecial\.has\(el\)/);
  assert.match(source,/oldSpecialParts\.has\(part\)/);
  assert.match(THEME_AUDIT_INSTALL_SCRIPT,/attributeFilter:\['class','style','aria-selected','aria-checked'\]/,
    "Native class/selection updates must not wait for 5-second polling");
  assert.doesNotMatch(source,/if\(settingsPage && mainPane\?\.querySelectorAll\)/);
  assert.match(source,/url\\\(/,"Avoid painting media thumbnails and CSS background assets");
  assert.doesNotMatch(source,/\.innerText|\.textContent|networkName|\bssid\b|localStorage|sessionStorage|\.value\b/i);
  assert.match(THEME_AUDIT_REMOVE_SCRIPT,/data-glm-settings-special-row/);
  assert.match(THEME_AUDIT_REMOVE_SCRIPT,/data-glm-settings-special-part/);
});

test("Special styling is main-window-only, loaded before Settings focus cleanup",()=>{
  const main=bundle.slice(bundle.indexOf('"main": ('),bundle.indexOf('"overlay": ('));
  const overlay=bundle.slice(bundle.indexOf('"overlay": ('),bundle.indexOf('    result = {}'));
  assert.match(main,/"settings-special.css"/);
  assert.doesNotMatch(overlay,/"settings-special.css"/);
  assert.ok(main.indexOf('"settings-special.css"')>main.indexOf('"settings-extras.css"'));
  assert.ok(main.indexOf('"settings-special.css"')<main.indexOf('"settings-focus.css"'));
});

test("Settings special row markers update across routes and disappear on exit",async()=>{
  const {default:vm}=await import("node:vm");
  const box=(x,y,w,h)=>({left:x,top:y,width:w,height:h,right:x+w,bottom:y+h});
  const items=[];
  const el=(x,y,w,h,role="")=>{
    const attrs=new Map();
    const obj={
      tagName:"DIV",className:"_steam",children:[],parentElement:null,
      setAttribute:(key,val)=>attrs.set(key,String(val)),
      removeAttribute:key=>attrs.delete(key),
      hasAttribute:key=>attrs.has(key),
      getAttribute:key=>key==="role"?role:attrs.get(key)??null,
      getBoundingClientRect:()=>box(x,y,w,h),
      querySelector:()=>null,
      querySelectorAll:()=>[],
      classList:{contains:name=>name==="Focusable"&&Boolean(role)},
    };
    items.push(obj);
    return obj;
  };
  const html=el(0,0,1000,760);
  const root=el(0,0,1000,760);root.className="BasicUI";
  const side=el(35,40,245,680),main=el(300,40,680,680);
  side.parentElement=root;main.parentElement=root;
  const nav=Array.from({length:12},(_,i)=>{
    const node=el(58,70+i*45,195,37);node.parentElement=side;return node;
  });
  const rows=Array.from({length:5},(_,i)=>{
    const node=el(327,170+i*85,620,51,i===3?"":i===0?"radio":"button");
    node.parentElement=main;return node;
  });
  const part=el(330,170,610,49);part.parentElement=rows[0];
  rows[0].querySelectorAll=selector=>selector==="div,section,li"?[part]:[];
  const toggle=el(327,610,620,51,"button");toggle.parentElement=main;
  toggle.querySelector=()=>({tagName:"DIV",className:"switch"});
  let visible=true;
  main.querySelectorAll=selector=>selector==="[class]"?
    [...rows,toggle]:[...rows,toggle];
  const document={
    documentElement:html,
    querySelector:q=>q===".BasicUI"?root:null,
    querySelectorAll:q=>q.includes("data-glm-")?
      items.filter(item=>q.split(",").some(token=>{
        const match=token.match(/\[([^\]]+)\]/);return match&&item.hasAttribute(match[1]);
      })):[],
    elementsFromPoint:(x,y)=>{
      if(!visible)return [];
      if(x<220)return nav.filter(n=>y>=n.getBoundingClientRect().top &&
        y<n.getBoundingClientRect().bottom);
      return rows.filter(n=>y>=n.getBoundingClientRect().top &&
        y<n.getBoundingClientRect().bottom);
    },
  };
  const window={innerWidth:1000,innerHeight:760,
    location:{pathname:"/settings/internet",hash:""}};
  const run=()=>vm.runInNewContext(STEAM_SETTINGS_MARK_SCRIPT,{
    document,window,getComputedStyle:node=>({
      // After CSS paints the row, getComputedStyle returns OUR navy, not
      // Steam's gray. The next watcher scan must retain the marker.
      backgroundColor:node.hasAttribute("data-glm-settings-special-row")?
        "rgb(15, 40, 66)":node.hasAttribute("data-glm-settings-special-part")?
        "rgba(0, 0, 0, 0)":node===part?"rgb(60,78,112)":"rgb(52,68,100)",
      backgroundImage:"none",
    }),Math,Array,Map,Set,String,Boolean,
  });
  assert.equal(run(),true);
  assert.equal(html.getAttribute("data-glm-settings-page"),"internet");
  assert.equal(rows[0].hasAttribute("data-glm-settings-special-row"),true);
  assert.equal(rows[3].hasAttribute("data-glm-settings-special-row"),true,
    "Native Customization movie cards may be ordinary unlabeled DIVs");
  assert.equal(part.hasAttribute("data-glm-settings-special-part"),true);
  assert.equal(run(),true,"Re-scanning an already colored Settings view must work");
  assert.equal(rows[0].hasAttribute("data-glm-settings-special-row"),true,
    "Do not remove the marked row just because CSS has recolored it navy");
  assert.equal(part.hasAttribute("data-glm-settings-special-part"),true,
    "Do not remove a marked flat child when CSS made it transparent");
  assert.equal(toggle.hasAttribute("data-glm-settings-special-row"),false,
    "A full-width row with a functional switch must not be recolored");
  window.location.pathname="/settings/keyboard";
  assert.equal(run(),true);
  assert.equal(html.getAttribute("data-glm-settings-page"),"keyboard");
  window.location.pathname="/settings/customization";
  assert.equal(run(),true);
  assert.equal(html.getAttribute("data-glm-settings-page"),"customization");
  window.location.pathname="/unrelated-steam-route";
  assert.equal(run(),true,"Settings geometry must win even if Steam routes are unconventional");
  assert.equal(rows[0].hasAttribute("data-glm-settings-special-row"),true,
    "No category-specific route is required to theme native gray Settings rows");
  assert.equal(html.hasAttribute("data-glm-settings-page"),false,
    "Unknown path has no category marker but the theme still applies");
  visible=false;window.location.pathname="/library/home";
  assert.equal(run(),false);
  assert.equal(html.hasAttribute("data-glm-settings-page"),false);
  assert.equal(rows[0].hasAttribute("data-glm-settings-special-row"),false);
  assert.equal(part.hasAttribute("data-glm-settings-special-part"),false);
});
