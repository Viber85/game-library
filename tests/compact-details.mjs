import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {expandThemeClassAliases} from "../src/themeClassAliases.ts";
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
  const document={
    documentElement:root,
    querySelectorAll:()=>heroAssets,
  };
  const ctx={document,window,Image:MockImage,getComputedStyle:()=>({
    getPropertyValue:key=>key==="--glm-compact-details-effective"&&styleState.active?"1":"",
  })};
  return {ctx,root,location,styleState,heroAssets,attrs,props,images,timers,cleared};
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
  assert.ok(fake.ctx.window.__gameLibraryCompactDetails12);
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
  assert.equal(fake.ctx.window.__gameLibraryCompactDetails12,undefined);
});

test("CSS activates by Steam's actual game DOM instead of hidden pathname",()=>{
  for(const rule of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const selector=rule[1].trim();
    assert.ok(selector.includes(':root:has(.BasicUI [class*="sharedappdetailsheader_TopCapsule"])') ||
      selector.startsWith("@media"),
      "Unscoped compact selector: "+selector.slice(0,110));
    assert.doesNotMatch(rule[2],/\bdisplay:\s*none|\bvisibility:\s*hidden/,
      "Compact layout must not hide native Steam buttons or content");
  }
  assert.match(clean,/--glm-compact-details-effective:1/);
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
  assert.match(panel,/Compact CSS matching native game/);
  assert.match(controller,/selectCompactDetails/);
  assert.match(backend,/async def set_compact_details\(self, enabled: bool\)/);
  assert.match(backend,/settings\.get\("compact_details", False\) is True/);
  assert.match(runtime,/syncCompactDetailsDom\(title,compactDetails\)/);
  assert.match(runtime,/await bounded\(injectCssIntoTab\(title,css\)/);
  assert.match(runtime,/await bounded\(removeCssFromTab\(title,previous\.cssId\)/);
});
