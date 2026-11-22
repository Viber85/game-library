import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {expandThemeClassAliases} from "../src/themeClassAliases.ts";
import {nativeCompactHintsFromCss,compactHintsInjection} from "../src/compactDetailsAnchors.ts";
import {
  COMPACT_DETAILS_INSTALL_SCRIPT,COMPACT_DETAILS_REMOVE_SCRIPT,
} from "../src/compactDetailsDom.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const css=read("system-theme/game-details-compact.css");
const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");

function fakeSteamCEF(){
  const attrs=new Map(),props=new Map(),images=[],timers=new Map(),cleared=[];
  const styleState={active:true};
  const heroAssets=[];
  const root={
    hasAttribute:key=>attrs.has(key),
    getAttribute:key=>attrs.get(key),
    setAttribute:(key,v)=>attrs.set(key,String(v)),
    removeAttribute:key=>attrs.delete(key),
    style:{
      setProperty:(key,v)=>props.set(key,v),
      removeProperty:key=>props.delete(key),
      getPropertyValue:key=>props.get(key)??"",
    },
  };
  const location={pathname:"/library/app/1091500",hash:""};
  const window={
    location,innerHeight:800,
    setInterval:(f,ms)=>{const id=timers.size+1;timers.set(id,{f,ms});return id;},
    clearInterval:id=>{cleared.push(id);timers.delete(id);},
  };
  class MockImage{
    onload=null;onerror=null;
    set src(url){this.url=url;images.push(this);}
  }
  const heroAttrs=new Map();
  const hero={
    querySelectorAll:()=>heroAssets,
    setAttribute:(key,value)=>heroAttrs.set(key,String(value)),
    removeAttribute:key=>heroAttrs.delete(key),
    hasAttribute:key=>heroAttrs.has(key),
    getBoundingClientRect:()=>({height:218,width:800,top:0,bottom:218}),
  };
  const document={
    documentElement:root,
    querySelectorAll:()=>heroAssets,
    querySelector:selector=>styleState.active&&selector.includes('sharedappdetailsheader_TopCapsule')?hero:null,
  };
  const ctx={document,window,Image:MockImage,getComputedStyle:()=>({
    getPropertyValue:key=>key==="--glm-compact-details-effective"&&styleState.active?"1":"",
  })};
  return {ctx,root,hero,location,styleState,heroAssets,attrs,props,images,timers,cleared};
}

test("real CSS DOM match activates layout even without route and falls back safely",()=>{
  const fake=fakeSteamCEF();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined);
  vm.runInNewContext(COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  assert.equal(fake.images.length,1);
  assert.equal(fake.images[0].url,
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900.jpg");
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined,
    "Cover must appear only after Steam CDN confirms image");
  fake.images[0].onload();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),"1");
  assert.match(fake.root.style.getPropertyValue("--glm-compact-poster-url"),
    /library_600x900\.jpg/);

  // Steam client routing changes AppID while native details remain visible.
  fake.location.pathname="/library/app/123456";
  for(const {f} of fake.timers.values())f();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined);
  assert.equal(fake.images.length,2);
  fake.images[1].onerror();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined);

  // When native game DOM disappears, style stops matching and cover is removed.
  fake.styleState.active=false;
  for(const {f} of fake.timers.values())f();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined);
  assert.equal(fake.root.style.getPropertyValue("--glm-compact-poster-url"),"");
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
  assert.equal(fake.timers.size,0);
  fake.images[1].onload();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined);
});

test("Steam Game Mode static URL can recover game ID from visible native hero",()=>{
  const fake=fakeSteamCEF();
  fake.location.pathname="/routes/index.html";
  fake.heroAssets.push({
    src:"https://steamcdn-a.akamaihd.net/steam/apps/1091500/library_hero.jpg",
    currentSrc:"",style:{backgroundImage:""},
    getBoundingClientRect:()=>({width:820,height:220,top:30,bottom:250}),
  });
  vm.runInNewContext(COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  assert.equal(fake.images.length,0);
  for(const {f} of fake.timers.values())f();
  assert.equal(fake.images.length,1);
  assert.match(fake.images[0].url,/apps\/1091500\/library_600x900\.jpg/);
  fake.images[0].onload();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),"1");
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined);
});

test("Repeated injection upgrades the old observer and starts one new timer",()=>{
  const fake=fakeSteamCEF();
  let oldStopped=0;
  fake.ctx.window.__gameLibraryCompactDetails11={stop:()=>oldStopped++};
  vm.runInNewContext(COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  assert.equal(oldStopped,1);
  const one=fake.images.length;
  vm.runInNewContext(COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  assert.equal(fake.timers.size,1);
  assert.equal(fake.images.length,one);
  assert.ok(fake.ctx.window.__gameLibraryCompactDetails14);
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
  assert.equal(fake.ctx.window.__gameLibraryCompactDetails14,undefined);
});

test("CSS activates by Steam's actual game DOM instead of hidden pathname",()=>{
  for(const rule of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const selector=rule[1].trim();
    assert.ok(selector.includes(':root:has(.BasicUI [class*="sharedappdetailsheader_TopCapsule"])') ||
      selector.includes(':root .BasicUI [class*="appdetailsplaysection_PlayBar"]') ||
      selector.includes('[data-glm-native-compact-') ||
      selector.startsWith("@media"),
      "Unscoped compact selector: "+selector.slice(0,110));
    assert.doesNotMatch(rule[2],/\bdisplay:\s*none|\bvisibility:\s*hidden/,
      "Compact layout must not hide native Steam buttons or content");
  }
  assert.match(clean,/--glm-compact-details-effective:1/);
  assert.doesNotMatch(clean,/:root:has\([^\{]+\):has\(/,
    "Native header alone must activate Compact; PlayBar loads lazily");
  assert.match(clean,/:root \.BasicUI \[class\*="appdetailsplaysection_PlayBar"\]/);
  assert.match(clean,/content:"COMPACT · TEST"/);
  assert.doesNotMatch(clean,/\bSteamClient\b|#[Gg]amepadUI_Full_Root/);
  assert.match(clean,/appdetailsplaysection_PlayBar/);
  assert.match(clean,/appdetailssection_SectionTab/);
  assert.match(clean,/#hltb-for-deck/);
  assert.match(clean,/appdetailscommunityfeed_CommunityItem/);
});

test("DOM gate expands into current hashed Steam class aliases",()=>{
  const gate=':root:has(.BasicUI [class*="sharedappdetailsheader_TopCapsule"])'+
    ':has(.BasicUI :is([class*="appdetailsplaysection_PlayBar"],'+
    '[class*="basicappdetailssectionstyler_PlaySection"]))';
  const compiled=expandThemeClassAliases(gate+" {--glm-compact-details-effective:1;}",{
    sharedappdetailsheader:{TopCapsule:"_nativeHeaderX"},
    appdetailsplaysection:{PlayBar:"_nativePlayX"},
    basicappdetailssectionstyler:{PlaySection:"_nativeSectionX"},
  });
  assert.match(compiled,/\[class~="_nativeHeaderX"\]/);
  assert.match(compiled,/\[class~="_nativePlayX"\]/);
  assert.match(compiled,/\[class~="_nativeSectionX"\]/);
});

test("Native diagnostics verify that CSS is loaded AND really matches",()=>{
  const probe=read("src/themeProbe.ts");
  const runtime=read("src/builtinThemeRuntime.ts");
  const panel=read("src/BuiltinThemePanel.tsx");
  const controller=read("src/themeController.ts");
  const backend=read("main.py");
  assert.match(probe,/--glm-compact-details-effective/);
  assert.match(probe,/compactCssLoaded/);
  assert.match(probe,/compactStyleActive/);
  assert.match(runtime,/compactStyleActive:inspected.compactStyleActive/);
  assert.match(panel,/Native Steam hero/);
  assert.match(controller,/selectCompactDetails/);
  assert.match(backend,/async def set_compact_details\(self, enabled: bool\)/);
  assert.match(backend,/settings\.get\("compact_details", False\) is True/);
  assert.match(runtime,/syncCompactDetailsDom\(title,compactDetails,css\)/);
  assert.match(runtime,/await bounded\(injectCssIntoTab\(title,css\)/);
  assert.match(runtime,/await bounded\(removeCssFromTab\(title,previous\.cssId\)/);
});

test("Webpack semantic classes map to safe exact native hero/playbar selectors",()=>{
  const source='[class*="sharedappdetailsheader_TopCapsule"] {} '+
    '[class*="appdetailsplaysection_PlayBar"] {} '+
    '[class*="basicappdetailssectionstyler_PlaySection"] {} '+
    '[class*="appactionbutton_PlayButtonContainer"] {} '+
    '[class*="sharedappdetailsheader_TitleSection"] {} '+
    '[class*="appdetailssection_SectionHeader"] {}';
  const compiled=expandThemeClassAliases(source,{
    sharedappdetailsheader:{TopCapsule:"_nativeHeroX",TitleSection:"_nativeTitleX"},
    appdetailsplaysection:{PlayBar:"_nativeBarX"},
    basicappdetailssectionstyler:{PlaySection:"_nativePlaySectionX"},
    appactionbutton:{PlayButtonContainer:"_nativePlayButtonX"},
    appdetailssection:{SectionHeader:"_nativeSectionsX"},
  });
  const hints=nativeCompactHintsFromCss(compiled);
  assert.deepEqual(hints,{hero:"_nativeHeroX",playbar:"_nativeBarX",
    playsection:"_nativePlaySectionX",playbutton:"_nativePlayButtonX",
    title:"_nativeTitleX",sections:"_nativeSectionsX"});
  assert.match(compactHintsInjection(hints),/window\.__gameLibraryNativeCompactHints14=/);
  assert.equal(nativeCompactHintsFromCss(source).hero,"");
});

test("Native elements are tagged directly, measured and fully restored",()=>{
  const fake=fakeSteamCEF();
  const makeNode=(height)=>{
    const attributes=new Map();
    return {
      getBoundingClientRect:()=>({height}),
      hasAttribute:key=>attributes.has(key),
      setAttribute:(key,value)=>attributes.set(key,String(value)),
      removeAttribute:key=>attributes.delete(key),
    };
  };
  const hero=makeNode(190),play=makeNode(58),title=makeNode(100);
  const lookup={
    '[class~="_nativeHeroX"]':hero,
    '[class~="_nativeBarX"]':play,
    '[class~="_nativeTitleX"]':title,
  };
  fake.ctx.document.querySelector=selector=>lookup[selector]||null;
  fake.ctx.getComputedStyle=(node)=>({
    getPropertyValue:key=>{
      if(key==="--glm-compact-details-effective")return "1";
      if(key==="--glm-compact-hero-applied")
        return node===hero&&hero.hasAttribute("data-glm-native-compact-hero")?"1":"";
      if(key==="--glm-compact-playbar-applied")
        return node===play&&play.hasAttribute("data-glm-native-compact-playbar")?"1":"";
      return "";
    },
  });
  const hints={hero:"_nativeHeroX",playbar:"_nativeBarX",
    title:"_nativeTitleX",sections:""};
  vm.runInNewContext(compactHintsInjection(hints)+COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  const native=fake.ctx.window.__gameLibraryCompactDetails14.native;
  assert.equal(native.hero,true);
  assert.equal(native.playbar,true);
  assert.equal(native.heroStyle,true);
  assert.equal(native.playStyle,true);
  assert.equal(native.heroHeight,190);
  assert.equal(native.playHeight,58);
  assert.equal(native.aliases,3);
  assert.equal(hero.hasAttribute("data-glm-native-compact-hero"),true);
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
  assert.equal(hero.hasAttribute("data-glm-native-compact-hero"),false);
  assert.equal(play.hasAttribute("data-glm-native-compact-playbar"),false);
});

test("Root-matched CSS is not treated as proof that native elements changed",()=>{
  const probe=read("src/themeProbe.ts");
  const runtime=read("src/builtinThemeRuntime.ts");
  assert.match(probe,/latestNativeCompact/);
  assert.match(probe,/nativeCompactHeroStyled/);
  assert.match(probe,/nativeCompactPlayBarStyled/);
  assert.match(runtime,/nativeStyledRecently/);
  assert.match(runtime,/nativeHeroHeight:nativeRead.nativeCompactHeroHeight/);
});

test("PlaySection fallback styles real Steam actions when native PlayBar is absent",()=>{
  const fake=fakeSteamCEF();
  const sectionAttrs=new Map();
  const section={
    setAttribute:(key,value)=>sectionAttrs.set(key,String(value)),
    removeAttribute:key=>sectionAttrs.delete(key),
    hasAttribute:key=>sectionAttrs.has(key),
    getBoundingClientRect:()=>({height:84}),
  };
  fake.ctx.document.querySelector=selector=>
    selector==='[class~="_nativeHeroX"]'?fake.hero:
    selector==='[class~="_nativeSectionX"]'?section:null;
  fake.ctx.getComputedStyle=node=>({
    getPropertyValue:key=>key==="--glm-compact-details-effective"?"1":
      key==="--glm-compact-hero-applied"&&node===fake.hero?"1":
      key==="--glm-compact-playsection-applied"&&node===section&&
        section.hasAttribute("data-glm-native-compact-playsection")?"1":""
  });
  vm.runInNewContext(compactHintsInjection({
    hero:"_nativeHeroX",playbar:"",playsection:"_nativeSectionX",
    playbutton:"",title:"",sections:""
  })+COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  const native=fake.ctx.window.__gameLibraryCompactDetails14.native;
  assert.equal(native.hero,true);
  assert.equal(native.playbar,true);
  assert.equal(native.playSource,"PlaySection");
  assert.equal(native.playStyle,true);
  assert.equal(native.playHeight,84);
  assert.equal(section.hasAttribute("data-glm-native-compact-playsection"),true);
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
  assert.equal(section.hasAttribute("data-glm-native-compact-playsection"),false);
});

test("portrait remains stable across missing hero imagery and brief QAM transitions",()=>{
  const fake=fakeSteamCEF();
  fake.location.pathname="/routes/index.html";
  fake.heroAssets.push({
    src:"https://steamcdn-a.akamaihd.net/steam/apps/1091500/library_hero.jpg",
    currentSrc:"",style:{backgroundImage:""},
  });
  vm.runInNewContext(COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  for(const {f} of fake.timers.values())f();
  assert.equal(fake.images.length,1);
  fake.images[0].onload();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),"1");
  fake.heroAssets.length=0;
  for(const {f} of fake.timers.values())f();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),"1",
    "Steam's hero video is not proof of a game change");
  fake.styleState.active=false;
  for(const {f} of fake.timers.values())f();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),"1",
    "Short DOM transition must not clear the portrait");
  fake.styleState.active=true;
  for(const {f} of fake.timers.values())f();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),"1");
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined);
});


test("actual native action area paints only broad wrappers, never Play/Install controls",()=>{
  const fake=fakeSteamCEF();
  const attrs=()=>new Map();
  const make=(tagName,width,height,role="")=>{
    const data=attrs();
    return {
      tagName, className:"",
      children:[],
      getAttribute:key=>key==="role"?role:null,
      setAttribute:(key,v)=>data.set(key,String(v)),
      hasAttribute:key=>data.has(key),
      removeAttribute:key=>data.delete(key),
      getBoundingClientRect:()=>({width,height}),
    };
  };
  const section=make("SECTION",920,78);
  const wrapper=make("DIV",900,72);
  const button=make("BUTTON",235,48,"button");
  section.children=[wrapper,button];
  fake.ctx.document.querySelector=selector=>
    selector==='[class~="_nativeHeroX"]'?fake.hero:
    selector==='[class~="_nativeSectionX"]'?section:null;
  fake.ctx.getComputedStyle=()=>({
    getPropertyValue:()=> "1",
  });
  vm.runInNewContext(compactHintsInjection({
    hero:"_nativeHeroX",playbar:"",playsection:"_nativeSectionX",
    playbutton:"",title:"",sections:""
  })+COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  const state=fake.ctx.window.__gameLibraryCompactDetails14;
  assert.equal(state.revision,18);
  assert.equal(state.native.surfaceCount,1);
  assert.equal(wrapper.hasAttribute("data-glm-native-compact-surface"),true);
  assert.equal(button.hasAttribute("data-glm-native-compact-surface"),false);
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
  assert.equal(wrapper.hasAttribute("data-glm-native-compact-surface"),false);
  assert.equal(section.hasAttribute("data-glm-native-compact-playsection"),false);
});

test("minimal native CSS can flatten the blue wrappers without hiding Steam controls",()=>{
  assert.match(clean,/data-glm-native-compact-surface/);
  assert.match(clean,/--glm-compact-surface-applied:1/);
  assert.match(clean,/--glm-compact-hltb-applied:1/);
  assert.match(clean,/#hltb-for-deck/);
  assert.match(clean,/data-glm-native-compact-playsection/);
  assert.match(clean,/appdetailssection_SectionTab/);
  assert.match(clean,/appdetailsactivitysection_ActivityFeedContainer/);
  assert.doesNotMatch(clean,/\bdisplay:\s*none\b|\bvisibility:\s*hidden\b/);
  const source=read("src/compactDetailsDom.ts");
  assert.match(source,/markPlaySurfaces/);
  assert.match(source,/clearSurfaces/);
  assert.match(source,/state\.surfaces/);
});


test("portrait reuses the native game's observed hashed Steam art directory",()=>{
  const fake=fakeSteamCEF();
  fake.location.pathname="/routes/index.html";
  const hash="e".repeat(40);
  fake.heroAssets.push({
    src:"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/234567/"+hash+"/library_hero.jpg",
    style:{backgroundImage:""},
  });
  vm.runInNewContext(COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  for(const {f} of fake.timers.values())f();
  assert.equal(fake.images.length,1);
  assert.match(fake.images[0].url,
    /\/234567\/e{40}\/library_600x900_2x\.jpg$/);
  fake.images[0].onerror();
  assert.equal(fake.images.length,2);
  assert.match(fake.images[1].url,
    /\/234567\/e{40}\/library_600x900\.jpg$/);
  fake.images[1].onload();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),"1");
  assert.match(fake.root.style.getPropertyValue("--glm-compact-poster-url"),
    /\/234567\/e{40}\/library_600x900\.jpg/);
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined);
});

test("portrait falls back to safe un-hashed Steam URL, never a raw third-party URL",()=>{
  const fake=fakeSteamCEF();
  fake.location.pathname="/routes/index.html";
  const hash="b".repeat(40);
  fake.heroAssets.push({
    src:"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/234567/"+hash+"/library_hero.jpg",
    style:{backgroundImage:""},
  });
  vm.runInNewContext(COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  for(const {f} of fake.timers.values())f();
  fake.images[0].onerror();
  fake.images[1].onerror();
  assert.equal(fake.images.length,3);
  assert.equal(fake.images[2].url,
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/234567/library_600x900.jpg");
  assert.equal(fake.images.every(item=>item.url.startsWith("https://shared.fastly.steamstatic.com/")),true);
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
});


test("real computed blue panel is tagged, turns dark, and remains stable without flicker",()=>{
  const fake=fakeSteamCEF();
  fake.ctx.window.innerWidth=1200;
  fake.ctx.window.innerHeight=800;
  const attributes=new Map();
  const blue={
    tagName:"DIV",className:"_hashedBlueSection",parentElement:null,
    getAttribute:key=>attributes.get(key)||null,
    setAttribute:(key,value)=>attributes.set(key,String(value)),
    removeAttribute:key=>attributes.delete(key),
    hasAttribute:key=>attributes.has(key),
    getBoundingClientRect:()=>({
      left:40,right:1160,width:1120,height:74,top:352,bottom:426,
    }),
  };
  const button={
    tagName:"BUTTON",className:"gamepaddialog_Button",parentElement:blue,
    getAttribute:key=>key==="role"?"button":null,
    getBoundingClientRect:()=>({
      left:60,right:280,width:220,height:48,top:363,bottom:411,
    }),
  };
  fake.ctx.document.elementsFromPoint=(x,y)=>
    y>=352&&y<=426?[button,blue]:[];
  fake.ctx.getComputedStyle=node=>{
    const dark=blue.hasAttribute("data-glm-native-compact-painted");
    return {
      backgroundColor:node===blue?(dark?"rgb(11, 25, 40)":"rgb(24, 78, 167)"):"transparent",
      backgroundImage:"none",
      getPropertyValue:key=>key==="--glm-compact-painted-applied"&&dark?"1":
        key==="--glm-compact-hero-applied"?"1":"",
    };
  };
  vm.runInNewContext(COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  const state=fake.ctx.window.__gameLibraryCompactDetails14;
  assert.equal(state.native.paintCount,1);
  assert.equal(state.native.paintNeutralized,1);
  assert.equal(blue.hasAttribute("data-glm-native-compact-painted"),true);
  assert.equal(button.hasAttribute?.("data-glm-native-compact-painted")||false,false);
  const calls=[];
  const originalRemove=blue.removeAttribute;
  blue.removeAttribute=k=>{calls.push(k);originalRemove(k);};
  for(const {f} of fake.timers.values())f();
  assert.equal(state.native.paintCount,1);
  assert.equal(state.native.paintNeutralized,1);
  assert.equal(calls.includes("data-glm-native-compact-painted"),false,
    "Do not remove and re-add a working dark style every poll");
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
  assert.equal(blue.hasAttribute("data-glm-native-compact-painted"),false);
});

test("actual painted panel must be broad, below the native hero and not game artwork",()=>{
  const fake=fakeSteamCEF();
  fake.ctx.window.innerWidth=1200;
  fake.ctx.window.innerHeight=800;
  const attrs=new Map();
  const artwork={
    tagName:"DIV",className:"HeaderBackgroundImage",
    setAttribute:(k,v)=>attrs.set(k,String(v)),
    removeAttribute:k=>attrs.delete(k),
    getAttribute:()=>null,
    getBoundingClientRect:()=>({
      left:25,right:1170,width:1145,height:110,top:90,bottom:200,
    }),
  };
  const visibleButton={
    tagName:"DIV",className:"appactionbutton_PlayButtonContainer",
    getAttribute:()=>null,
    getBoundingClientRect:()=>({
      left:50,right:1100,width:1050,height:50,top:360,bottom:410,
    }),
  };
  fake.ctx.document.elementsFromPoint=()=>[artwork,visibleButton];
  fake.ctx.getComputedStyle=()=>({
    backgroundColor:"rgb(12, 85, 182)",backgroundImage:"none",
    getPropertyValue:()=>"",
  });
  vm.runInNewContext(COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  const state=fake.ctx.window.__gameLibraryCompactDetails14;
  assert.equal(state.native.paintCount,0);
  assert.equal(attrs.has("data-glm-native-compact-painted"),false);
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
});

test("paint diagnostics check actual CSS outcomes rather than class matches alone",()=>{
  const css=read("system-theme/game-details-compact.css");
  const runtime=read("src/builtinThemeRuntime.ts");
  const panel=read("src/BuiltinThemePanel.tsx");
  const probe=read("src/themeProbe.ts");
  assert.match(css,/--glm-compact-painted-applied:1/);
  assert.match(css,/data-glm-native-compact-painted/);
  assert.match(runtime,/nativePaintNeutralized/);
  assert.match(panel,/Panels confirmed dark by actual computed paint/);
  assert.match(probe,/nativeCompactPaintNeutralized/);
  assert.doesNotMatch(css,/\bdisplay:\s*none\s*!important/);
});
