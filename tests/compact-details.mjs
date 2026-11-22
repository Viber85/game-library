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
