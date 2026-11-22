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
    location,
    setInterval:(f,ms)=>{const id=timers.size+1;timers.set(id,{f,ms});return id;},
    clearInterval:id=>{cleared.push(id);timers.delete(id);},
  };
  class MockImage{
    onload=null;onerror=null;
    set src(url){this.url=url;images.push(this);}
  }
  const ctx={document:{documentElement:root},window,Image:MockImage};
  return {ctx,root,location,attrs,props,images,timers,cleared};
}

test("Default off, opt-in on, route switch and cleanup never change Steam UI actions",()=>{
  const fake=fakeSteamCEF();
  assert.equal(fake.root.getAttribute("data-glm-compact-details"),undefined);
  vm.runInNewContext(COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  assert.equal(fake.root.getAttribute("data-glm-compact-details"),"1");
  assert.equal(fake.images.length,1);
  assert.equal(fake.images[0].url,
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900.jpg");
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined,
    "Poster should be shown only if Steam CDN actually loaded");
  fake.images[0].onload();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),"1");
  assert.match(fake.root.style.getPropertyValue("--glm-compact-poster-url"),
    /library_600x900\.jpg/);

  // Steam client-side route navigation must stop the old game's cover.
  fake.location.pathname="/library/app/123456";
  for(const {f} of fake.timers.values())f();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined);
  assert.equal(fake.images.length,2);
  fake.images[1].onerror();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined);
  fake.location.pathname="/library/home";
  for(const {f} of fake.timers.values())f();
  assert.equal(fake.root.getAttribute("data-glm-compact-details"),undefined);
  assert.equal(fake.root.style.getPropertyValue("--glm-compact-poster-url"),"");

  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
  assert.equal(fake.timers.size,0);
  assert.equal(fake.cleared.length,1);
  fake.images[1].onload();
  assert.equal(fake.root.getAttribute("data-glm-compact-poster"),undefined,
    "Late network callbacks cannot revive a disabled cover");
});

test("Repeated inject is idempotent and only one per-tab timer exists",()=>{
  const fake=fakeSteamCEF();
  vm.runInNewContext(COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  const first=fake.ctx.window;
  const one=fake.images.length;
  vm.runInNewContext(COMPACT_DETAILS_INSTALL_SCRIPT,fake.ctx);
  assert.equal(fake.timers.size,1);
  assert.equal(fake.images.length,one);
  assert.ok(first.__gameLibraryCompactDetails11);
  vm.runInNewContext(COMPACT_DETAILS_REMOVE_SCRIPT,fake.ctx);
  assert.equal(first.__gameLibraryCompactDetails11,undefined);
});

test("Compact layout is scoped to an opted-in game route, never Steam Settings or QAM",()=>{
  for(const rule of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const selector=rule[1].trim();
    assert.ok(selector.includes(':root[data-glm-compact-details="1"]') ||
      selector.startsWith("@media"),
      "Unscoped compact selector: "+selector.slice(0,110));
    const declarations=rule[2];
    assert.doesNotMatch(declarations,/\bdisplay:\s*none|\bvisibility:\s*hidden/,
      "Must not hide any native button or Steam page functionality");
  }
  assert.doesNotMatch(clean,/\bSteamClient\b|#[Gg]amepadUI_Full_Root/);
  assert.match(clean,/sharedappdetailsheader_TopCapsule/);
  assert.match(clean,/appdetailsplaysection_PlayBar/);
  assert.match(clean,/appdetailssection_SectionTab/);
  assert.match(clean,/#hltb-for-deck/);
  assert.match(clean,/appdetailscommunityfeed_CommunityItem/);
  assert.match(clean,/pointer-events:none/);
  assert.doesNotMatch(clean,/pointer-events:none[^\n]*appactionbutton/);
});

test("Compact Steam details styles support hashed Steam CSS modules",()=>{
  const out=expandThemeClassAliases(
    ':root[data-glm-compact-details="1"] .BasicUI [class*="sharedappdetailsheader_TopCapsule"]'+
    ', :root[data-glm-compact-details="1"] .BasicUI [class*="appdetailsplaysection_PlayBar"] {}',
    {
      sharedappdetailsheader:{TopCapsule:"_nativeHeaderX"},
      appdetailsplaysection:{PlayBar:"_nativePlayX"},
    });
  assert.match(out,/\[class~="_nativeHeaderX"\]/);
  assert.match(out,/\[class~="_nativePlayX"\]/);
});

test("Compact CSS is optional, bundled and switched via atomic native Steam CSS runtime",()=>{
  const backend=read("main.py");
  const controller=read("src/themeController.ts");
  const runtime=read("src/builtinThemeRuntime.ts");
  const hub=read("src/AppearancePage.tsx");
  const qam=read("src/BuiltinThemePanel.tsx");
  const pkg=read("scripts/package.sh");
  assert.match(backend,/async def set_compact_details\(self, enabled: bool\)/);
  assert.match(backend,/settings\.get\("compact_details", False\) is True/);
  assert.match(backend,/game-details-compact\.css/);
  assert.match(controller,/async function selectCompactDetails\(enabled:boolean\)/);
  assert.match(controller,/setCompactDetailsMode\(setting\.compact_details===true\)/);
  assert.match(runtime,/syncCompactDetailsDom\(title,compactDetails\)/);
  assert.match(runtime,/await bounded\(injectCssIntoTab\(title,css\)/);
  assert.match(runtime,/await bounded\(removeCssFromTab\(title,previous\.cssId\)/);
  assert.match(runtime,/setCompactDetailsMode\(enabled:boolean\)/);
  assert.match(hub,/Compact Game Details · Test/);
  assert.match(qam,/Compact Game Details · Test/);
  assert.match(pkg,/game-library\/system-theme\/game-details-compact\.css/);
});
