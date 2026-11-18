import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
  STEAM_SETTINGS_MARK_SCRIPT,
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
    querySelectorAll:()=>[row],querySelector:()=>row};
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

test("captures minified Steam Settings via route and actual computed blue rows",()=>{
  let mode="settings",tick=()=>{};
  const rows=Array.from({length:7},(_,i)=>({
    tagName:"DIV",className:"_steam_field_"+i,
  }));
  const root={className:"BasicUI",querySelectorAll:(selector)=>
    mode==="settings" && selector==="[class]"?rows:[]};
  const state={location:{pathname:"/settings/system",hash:""}};
  const doc={
    documentElement:{},body:root,
    querySelector:(selector)=>selector.includes(".BasicUI")?root:null,
    querySelectorAll:(selector)=>{
      if(selector==="style")return [{textContent:"--game-library-midnight-active: 42;"}];
      if(selector.includes(".BasicUI")||selector.includes("#GamepadUI_Full_Root"))return [root];
      return [];
    }
  };
  const browser={window:state,document:doc,Date,JSON,Set,Map,Array,Math,
    getComputedStyle:()=>({
      backgroundColor:"rgb(58, 103, 171)",
      getPropertyValue:()=> "42",
    }),
    setInterval:(fn)=>{tick=fn;return 1;},
    clearInterval:()=>{},
  };
  const run=(script)=>vm.runInNewContext(script,browser);
  assert.equal(run(THEME_AUDIT_INSTALL_SCRIPT),true);
  mode="qam";
  tick();
  const audit=parseThemeAudit(run(THEME_AUDIT_READ_SCRIPT));
  const chosen=latestThemePage(audit,Date.now());
  assert.equal(chosen?.kind,"Settings");
  assert.equal(chosen?.sample.probe.settingsRoots,0,
    "The old semantic Steam selector still does not match");
  assert.equal(chosen?.sample.probe.routeKind,"settings");
  assert.equal(chosen?.sample.probe.surfaceElements,7);
  assert.equal(chosen?.sample.probe.colorSamples[0]?.color,"rgb(58, 103, 171)");
  assert.ok((audit?.sampleTicks||0)>=2);
});

test("unknown route returns a clearly labeled CSS surface sample, not a fake Settings match",()=>{
  const now=Date.now();
  const data=parseThemeAudit({
    installed:true,sampleTicks:4,lastScanAt:now,
    latestSettings:null,latestGame:null,
    latestOther:{at:now,probe:{
      visibleUI:true,routeKind:"other",surfaceElements:5,
      colorSamples:[{color:"rgb(54, 102, 164)",count:5,className:"_steam_abc123"}]
    }}
  });
  const item=latestThemePage(data,now);
  assert.equal(item?.kind,"Unclassified");
  assert.equal(item?.sample.probe.colorSamples[0]?.className,"_steam_abc123");
});


test("hashed Steam Settings gray rows adopt stable Midnight markers without reading labels",()=>{
  let mode="settings";
  const element=(x,y,w,h,color)=> {
    const attrs=new Set();
    return {
      tagName:"DIV",className:"_minified"+y,children:[],
      setAttribute:(name)=>attrs.add(name),
      removeAttribute:(name)=>attrs.delete(name),
      hasAttribute:(name)=>attrs.has(name),
      getBoundingClientRect:()=>({
        left:x,top:y,width:w,height:h,right:x+w,bottom:y+h,
      }),
      get color(){return attrs.has("data-glm-settings-row")?
        "rgb(12, 27, 50)":color;},
    };
  };
  const nav=Array.from({length:12},(_,i)=>element(50,68+i*43,210,36,"rgb(55, 88, 140)"));
  const rows=Array.from({length:8},(_,i)=>element(300,155+i*54,640,39,"rgb(76, 160, 255)"));
  const root=element(0,0,1000,760,"rgb(2, 8, 21)");
  root.className="BasicUI";
  root.querySelectorAll=(selector)=>selector==="[class]"&&mode==="settings"?
    [...nav,...rows]:[];
  const nodes=[root,...nav,...rows];
  const doc={
    documentElement:{clientWidth:1000,clientHeight:760},
    querySelector:(selector)=>selector===".BasicUI"?root:null,
    querySelectorAll:(selector)=>selector.startsWith("[data-glm-")?
      nodes.filter(n=>selector.split(",").some(token=>n.hasAttribute(token.slice(1,-1)))):[],
  };
  const run=()=>vm.runInNewContext(STEAM_SETTINGS_MARK_SCRIPT,{
    window:{innerWidth:1000,innerHeight:760},document:doc,
    getComputedStyle:(node)=>({backgroundColor:node.color}),
    Array,Map,Set,Math,
  });
  assert.equal(run(),true,"The real Settings geometry is detected without classes");
  assert.equal(root.hasAttribute("data-glm-settings-root"),true);
  assert.equal(rows.filter(n=>n.hasAttribute("data-glm-settings-row")).length,8);
  assert.equal(nav.filter(n=>n.hasAttribute("data-glm-settings-navitem")).length,12);
  assert.equal(run(),true,"Styled rows remain detected on subsequent scans");
  assert.equal(rows.filter(n=>n.hasAttribute("data-glm-settings-row")).length,8);
  mode="home";
  assert.equal(run(),false);
  assert.equal(root.hasAttribute("data-glm-settings-root"),false);
  assert.equal(rows.some(n=>n.hasAttribute("data-glm-settings-row")),false);
  assert.doesNotMatch(STEAM_SETTINGS_MARK_SCRIPT,
    /\.innerText|\.textContent|localStorage|sessionStorage|ssid|networkName|\.value\b/i);
});


test("visible Settings rows are themed by point sampling even beyond 1450 DOM nodes",()=>{
  let mode="settings";
  const make=(x,y,w,h)=>{
    const attributes=new Set();
    return {
      tagName:"DIV",className:"_steam_minified",children:[],parentElement:null,
      setAttribute:(key)=>attributes.add(key),
      removeAttribute:(key)=>attributes.delete(key),
      hasAttribute:(key)=>attributes.has(key),
      getBoundingClientRect:()=>({
        left:x,top:y,width:w,height:h,right:x+w,bottom:y+h,
      }),
    };
  };
  const root=make(0,0,1000,800);root.className="BasicUI";
  root.querySelectorAll=(selector)=>{
    if(selector==="[class]")throw new Error("Do not enumerate full Steam DOM");
    return [];
  };
  const html=make(0,0,1000,800);
  const sidebar=make(30,50,260,700),main=make(300,50,700,700);
  // Mimic Storage: games are in a nested scroll list, while disk tabs sit
  // in the surrounding Settings content pane.
  const storageScroll=make(310,85,680,620);
  sidebar.parentElement=root;main.parentElement=root;
  storageScroll.parentElement=main;
  const left=Array.from({length:12},(_,i)=>make(75,86+i*42,205,34));
  const right=Array.from({length:8},(_,i)=>make(321,155+i*56,655,42));
  for(const item of left)item.parentElement=sidebar;
  for(const item of right)item.parentElement=storageScroll;
  // Steam can draw a row via a 100%-width child and deeper gradient wrapper.
  // The older 98%-width cutoff failed to clear precisely these surfaces.
  const paintFull=make(321,155,655,42);
  const paintNested=make(321,155,655,42);
  const paintDeep=make(321,155,655,42);
  const nativeControl=make(800,155,155,35);
  nativeControl.tagName="BUTTON";
  nativeControl.className="gamepaddropdown_DropDownControlButton_x";
  paintNested.children=[paintDeep,nativeControl];
  paintFull.children=[paintNested];
  right[0].children=[paintFull];
  paintFull.parentElement=right[0];
  paintNested.parentElement=paintFull;
  paintDeep.parentElement=paintNested;
  nativeControl.parentElement=paintNested;
  // Rows already mounted below the visible scroll viewport must not
  // wait for their first scroll event before receiving Midnight colors.
  const offscreen=[make(321,930,655,42),make(321,1090,655,42)];
  for(const item of offscreen)item.parentElement=main;
  const tinyControl=make(900,1130,70,36);
  tinyControl.parentElement=main;
  main.querySelectorAll=(selector)=>selector==="[class]"?
    [...right,...offscreen,tinyControl]:[];
  const nodes=[root,sidebar,main,storageScroll,...left,...right,
    paintFull,paintNested,paintDeep,nativeControl,...offscreen,tinyControl,html];
  const doc={
    documentElement:html,
    querySelector:(selector)=>selector===".BasicUI"?root:null,
    querySelectorAll:(selector)=>selector.startsWith("[data-glm-")?
      nodes.filter(n=>selector.split(",").some(part=>
        n.hasAttribute(part.trim().slice(1,-1)))):[],
    elementsFromPoint:(x,y)=>mode==="settings"?
      [...left,...right].filter(n=>{
        const b=n.getBoundingClientRect();
        return x>=b.left && x<b.right && y>=b.top && y<b.bottom;
      }):[],
  };
  const run=()=>vm.runInNewContext(STEAM_SETTINGS_MARK_SCRIPT,{
    window:{innerWidth:1000,innerHeight:800},document:doc,
    getComputedStyle:(node)=>({
      backgroundColor:node===paintDeep?"rgb(76, 160, 255)":"rgba(0, 0, 0, 0)",
      backgroundImage:node===paintDeep?"linear-gradient(blue,navy)":"none",
    }),
    Math,Map,Set,Array,
  });
  assert.equal(run(),true);
  assert.equal(html.hasAttribute("data-glm-settings-root"),true,
    "Document root can scope CSS even when Settings uses a separate React root");
  assert.equal(sidebar.hasAttribute("data-glm-settings-sidebar"),true);
  assert.equal(main.hasAttribute("data-glm-settings-main"),true,
    "Outer Settings canvas must include Storage disk tabs, not just games");
  assert.equal(storageScroll.hasAttribute("data-glm-settings-main"),false,
    "Nested scrolling container must not replace the outer Settings pane");
  assert.equal(right.filter(n=>n.hasAttribute("data-glm-settings-row")).length,8);
  for(const layer of [paintFull,paintNested,paintDeep])
    assert.equal(layer.hasAttribute("data-glm-settings-row-part"),true,
      "All full-width nested color layers must be made transparent");
  assert.equal(nativeControl.hasAttribute("data-glm-settings-row-part"),false,
    "Never make dropdown controls transparent");
  assert.equal(offscreen.filter(n=>n.hasAttribute("data-glm-settings-row")).length,2,
    "Pre-existing offscreen rows must be themed before scrolling");
  assert.equal(tinyControl.hasAttribute("data-glm-settings-row"),false,
    "Small controls and icons must not be mistaken for field strips");
  assert.equal(left.filter(n=>n.hasAttribute("data-glm-settings-navitem")).length,12);
  assert.equal(run(),true,"Already recolored/transparent rows stay detected");
  mode="home";
  assert.equal(run(),false);
  assert.equal(html.hasAttribute("data-glm-settings-root"),false);
  assert.equal(main.hasAttribute("data-glm-settings-main"),false);
  assert.equal(offscreen.some(n=>n.hasAttribute("data-glm-settings-row")),false);
});


test("sparse Family-like Settings canvas is marked without recoloring its action button",()=>{
  const make=(x,y,w,h)=>{
    const attrs=new Set();
    return {
      tagName:"DIV",className:"_steam_hash",parentElement:null,children:[],
      setAttribute:(name)=>attrs.add(name),
      removeAttribute:(name)=>attrs.delete(name),
      hasAttribute:(name)=>attrs.has(name),
      getBoundingClientRect:()=>({
        left:x,top:y,width:w,height:h,right:x+w,bottom:y+h,
      }),
    };
  };
  let mode="settings";
  const root=make(0,0,1000,800);root.className="BasicUI";
  const html=make(0,0,1000,800);
  const sidebar=make(40,40,210,720),main=make(250,40,730,720);
  const nav=Array.from({length:11},(_,i)=>make(48,80+i*54,196,36));
  const action=make(270,170,460,36);
  for(const row of nav)row.parentElement=sidebar;
  action.parentElement=main;
  sidebar.parentElement=root;main.parentElement=root;
  root.querySelectorAll=(key)=>key==="[class]" && mode==="settings"?
    [...nav,action]:[];
  main.querySelectorAll=()=>[action];
  const nodes=[root,html,sidebar,main,...nav,action];
  const doc={
    documentElement:html,
    querySelector:(key)=>key===".BasicUI"?root:null,
    querySelectorAll:(key)=>key.startsWith("[data-glm-")?
      nodes.filter(node=>key.split(",").some(part=>
        node.hasAttribute(part.trim().slice(1,-1)))):[],
    elementsFromPoint:(x,y)=>{
      if(mode!=="settings")return [];
      if(x>500)return [main];
      return nav.filter(node=>{
        const b=node.getBoundingClientRect();
        return x>=b.left&&x<b.right&&y>=b.top&&y<b.bottom;
      });
    },
  };
  const run=()=>vm.runInNewContext(STEAM_SETTINGS_MARK_SCRIPT,{
    document:doc,window:{innerWidth:1000,innerHeight:800},Math,Map,Set,Array,
    getComputedStyle:()=>({backgroundColor:"rgba(0,0,0,0)",backgroundImage:"none"}),
  });
  assert.equal(run(),true,"Sparse Settings page is detected from real navigation");
  assert.equal(html.hasAttribute("data-glm-settings-root"),true);
  assert.equal(main.hasAttribute("data-glm-settings-main"),true);
  assert.equal(action.hasAttribute("data-glm-settings-row"),false,
    "Single action remains white/interactive rather than a dark field");
  assert.equal(run(),true,"Stable DOM keeps the palette before scrolling");
  mode="game";
  assert.equal(run(),false,"Unrelated pages must not keep Settings styling");
  assert.equal(html.hasAttribute("data-glm-settings-root"),false);
  assert.equal(main.hasAttribute("data-glm-settings-main"),false);
});

test("fast Midnight watcher responds to Steam DOM changes before slow polling",()=>{
  let observed=null,notify=null,frame=null,frameCalls=0,scans=0;
  let disconnected=0,cancelled=0,stopped=0,fallbackMs=0;
  let onScroll=null,removedScroll=0;
  const root={querySelectorAll:()=>[]};
  const document={
    documentElement:{},body:root,
    addEventListener:(event,fn,capture)=>{if(event==="scroll"&&capture)onScroll=fn;},
    removeEventListener:(event,fn,capture)=>{
      if(event==="scroll"&&capture&&fn===onScroll)removedScroll++;
    },
    querySelector:(query)=>query.includes(".BasicUI")?root:null,
    querySelectorAll:(query)=>query==="style"?
      [{textContent:"--game-library-midnight-active: 44;"}]:[],
  };
  class MockObserver {
    constructor(callback){notify=callback;}
    observe(node,options){observed={node,options};}
    disconnect(){disconnected++;}
  }
  const window={};
  const context={window,document,Date,JSON,Set,Map,Array,Math,
    MutationObserver:MockObserver,
    getComputedStyle:()=>({
      backgroundColor:"rgb(2, 8, 21)",getPropertyValue:()=> "44",
    }),
    requestAnimationFrame:(callback)=>{frameCalls++;frame=callback;return 7;},
    cancelAnimationFrame:(id)=>{if(id===7)cancelled++;},
    setInterval:(_callback,delay)=>{fallbackMs=delay;return 12;},
    clearInterval:(id)=>{if(id===12)stopped++;},
  };
  const run=(script)=>vm.runInNewContext(script,context);
  assert.equal(run(THEME_AUDIT_INSTALL_SCRIPT),true);
  assert.equal(observed?.node,document.documentElement);
  assert.equal(observed?.options.childList,true);
  assert.equal(observed?.options.subtree,true);
  assert.equal(observed?.options.attributes,true,
    "Native Settings updates can reuse rows and change only class/style");
  assert.deepEqual(Array.from(observed?.options.attributeFilter||[]),
    ["class","style","aria-selected","aria-checked"],
    "Our data-glm-* markers must NOT be watched or cause recursive scans");
  assert.equal(fallbackMs,5000,"Periodic scan is only a slow fallback");
  scans=parseThemeAudit(run(THEME_AUDIT_READ_SCRIPT)).sampleTicks;
  assert.equal(scans,1,"Initial synchronous scan still runs");
  notify([{type:"attributes",attributeName:"class"}]);
  notify([{type:"attributes",attributeName:"style"}]);
  notify([{type:"childList"}]); // React can reuse or insert Settings rows
  assert.equal(typeof onScroll,"function","Nested scrolling must trigger the watcher");
  onScroll(); // The same frame is shared by DOM updates and scroll movement.
  assert.equal(frameCalls,1,"DOM and scroll changes coalesce into one frame");
  assert.equal(parseThemeAudit(run(THEME_AUDIT_READ_SCRIPT)).sampleTicks,2,
    "MutationObserver recolors synchronously, before the next paint");
  frame();
  assert.equal(parseThemeAudit(run(THEME_AUDIT_READ_SCRIPT)).sampleTicks,3,
    "Animation frame is only a fallback for staggered Steam layouts");
  notify(); // An update queued while Midnight is being disabled
  assert.equal(run(THEME_AUDIT_REMOVE_SCRIPT),true);
  assert.equal(disconnected,1);
  assert.equal(removedScroll,1,"Scroll listener removed on theme disable");
  assert.equal(cancelled,1);
  assert.equal(stopped,1);
  assert.equal(parseThemeAudit(run(THEME_AUDIT_READ_SCRIPT)).installed,false);
  frame(); // Stale queued frame after removal must not run a scan
  assert.equal(parseThemeAudit(run(THEME_AUDIT_READ_SCRIPT)).sampleTicks,0);
});
