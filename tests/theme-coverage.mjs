import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const css = (name) =>
  readFileSync(new URL("../system-theme/"+name,import.meta.url),"utf8");
const settings = css("settings-extras.css");
const games = css("game-details-extras.css");

function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g,"");
}
function assertBalancedCss(source) {
  // Handles strings and escapes before verifying bracket/brace balance.
  const text=stripCssComments(source);
  let quote=null,escaped=false;
  const stack=[];
  const opens={"{":"}","(":")","[":"]"};
  for (const ch of text) {
    if (quote) {
      if(escaped){escaped=false;continue;}
      if(ch==="\\"){escaped=true;continue;}
      if(ch===quote)quote=null;
      continue;
    }
    if(ch==="'"||ch==='"'){quote=ch;continue;}
    if(opens[ch]){stack.push(opens[ch]);continue;}
    if(ch==="}"||ch===")"||ch==="]"){
      assert.equal(stack.pop(),ch,"Unbalanced selector/block in CSS");
    }
  }
  assert.equal(quote,null,"Unterminated CSS string");
  assert.deepEqual(stack,[],"Incomplete CSS blocks");
}

test("full Midnight theme CSS is syntactically balanced",()=>{
  for(const name of ["shared.css","settings.css","settings-extras.css",
    "game-details.css","game-details-extras.css","buttons.css",
    "downloads.css","dialogs.css","qam.css","menus.css",
    "running-menu.css","steam-input.css","volume.css","power-menu.css"])
    assertBalancedCss(css(name));
});

test("Steam root stays transparent for volume and achievement popups",()=>{
  const shared=stripCssComments(css("shared.css"));
  // GamepadUI / BasicUI may be used as a transparent full-screen CEF
  // overlay over a running game. Only explicit panels may be opaque.
  assert.doesNotMatch(shared,/#[Gg]amepadUI_Full_Root\s*,\s*\.BasicUI\s*\{/);
  assert.doesNotMatch(shared,/(?:#GamepadUI_Full_Root|\.BasicUI)\s*\{\s*background(?:-color)?\s*:/);
  assert.ok(shared.includes("--glm-bg: #020815"));
  assert.ok(css("qam.css").includes("#QuickAccess-Menu"));
  assert.ok(css("settings-extras.css").includes("[data-glm-settings-main]"));
});

test("QAM selected tab is styled even while its content panel has focus",()=>{
  const qam=stripCssComments(css("qam.css"));
  assert.ok(qam.includes(':is(.quickaccessmenu_Tab_1S76C,'),
    "QAM native tab class must be a global selector, not restricted to old portal parents");
  assert.doesNotMatch(qam,/\b(?:width|min-width|max-width|flex|flex-basis|height|min-height|max-height|box-sizing|margin|padding|overflow|transform|position)\s*:/,
    "QAM must preserve native Steam rail, icon and plugin-panel layout");
  assert.ok(!qam.includes('[class*="quickaccessmenu_TabContentColumn_"]'),
    "Do not constrain the native inner tab column");
  assert.ok(qam.includes(".quickaccessmenu_Selected_2QHMu"),
    "An active QAM section must retain a visible ring when the right panel owns focus");
  assert.equal((qam.match(/box-shadow:inset 0 0 0 2px #63cfff,/g)??[]).length,2,
    "Selected and focused icons both show cyan border");
  assert.ok(qam.includes("0 0 12px rgba(3,157,255,.68)"),
    "Focused icon retains a blue glow");
  assert.doesNotMatch(qam,/:hover/, "Idle cursor hover must not mimic controller focus");
  assert.doesNotMatch(qam,/#GamepadUI_Full_Root[^\n]*\s*\{/,
    "Never paint the root behind volume/achievement overlays");
});

test("All Settings categories use a flat canvas with no overlay-wide paint",()=>{
  const settingsCss=stripCssComments(css("settings-extras.css"));
  assert.ok(settingsCss.includes("html[data-glm-settings-root] [data-glm-settings-surface]"),
    "The gradient-bearing inner content layers must be flattened");
  assert.ok(settingsCss.includes("background-image:none !important"),
    "Settings gradient images are removed");
  assert.ok(settingsCss.includes(
    "html[data-glm-settings-root] :is(.BasicUI,#GamepadUI_Full_Root)[data-glm-settings-root]"),
    "The full root is painted ONLY on verified Settings pages");
  assert.ok(!stripCssComments(css("shared.css")).includes(
    "background:#0a1b30 !important;"),"No shared-root Settings fill");
  const watcher=readFileSync(new URL("../src/themeProbe.ts",import.meta.url),"utf8");
  assert.match(watcher,/data-glm-settings-surface/);
  assert.ok(watcher.includes("nav.length>=10"),"Sparse Family pages count as Settings");
  assert.ok(watcher.includes("const previous=Array.from"),"Existing themed markers are preserved");
  assert.ok(watcher.includes("new MutationObserver(()=>{"));
  assert.ok(watcher.includes("lastFastScan=now;")&&watcher.includes("sample();"));
});

test("Option A leaves every idle strip entirely clear and keeps controller focus",()=>{
  const marker="/* v0.4.10 — transparent Settings rows (Variant A).";
  const start=settings.lastIndexOf(marker);
  assert.ok(start>settings.indexOf("/* v0.4.9"),"Variant A must override old blue rows last");
  const variant=settings.slice(start);
  const clean=stripCssComments(variant);
  assert.ok(clean.includes("html[data-glm-settings-root] [data-glm-settings-row]"));
  assert.ok(clean.includes("html[data-glm-settings-root] [data-glm-settings-main] [data-glm-settings-row]"),
    "Higher-specificity fallback beats older painted content wrappers");
  assert.ok(clean.includes(":where(:not(button)"),"Avoid focus losing to :not() specificity");
  assert.ok(clean.includes("background:transparent !important"));
  assert.ok(clean.includes("background-color:transparent !important"));
  assert.ok(clean.includes("background-image:none !important"));
  assert.ok(!clean.includes("box-shadow:inset 0 -1px 0 rgba(118,181,227,.18)"),
    "No line/shadow should make a transparent strip visible");
  assert.ok(clean.includes("box-shadow:none !important;"),
    "Normal strips have no simulated separators");
  assert.match(clean,/\.gpfocus,\.gpfocuswithin,:focus-visible,:focus-within/);
  assert.ok(clean.includes("background:#163a5e !important"),
    "Focused row retains visible blue Midnight highlight");
  assert.ok(clean.includes("box-shadow:inset 3px 0 0 #4ac1ff !important"),
    "Controller-focus accent is preserved");
  assert.ok(clean.includes("background:#123452 !important"),
    "Interactive dropdown/input/button controls keep their filled background");
  assert.ok(clean.includes("background:#1d527d !important"),
    "Focused controls still have a stronger filled background");
  for(const selector of ["gamepaddialog_Field","gamepaddialog_HighlightOnFocus",
    "networksettings_NetworkItem","networksettings_Connected",
    "gamepadpagedsettings_SectionHeader"])
    assert.ok(clean.includes(selector),selector);
  for(const rule of clean.split("}")){
    if(!rule.includes("{"))continue;
    assert.ok(rule.split("{")[0].includes("html[data-glm-settings-root]"),
      "All transparent overrides are scoped to a detected Settings page");
  }
  assert.doesNotMatch(clean,/#QuickAccess-Menu|#GamepadUI_Full_Root|\.gl-root/);
});

test("Every old native or hashed idle row rule is transparent at its source",()=>{
  const rowSelector=/data-glm-settings-row|gamepaddialog_Field|gamepaddialog_HighlightOnFocus|gamepadpagedsettings_SettingsRow|gamepadsettings_SettingsRow|networksettings_Network|networksettings_Connected|wifisettings_Network|connectionsettings_Network|\[role="listbox"\]|\[role="list"\]/;
  let checked=0;
  for(const file of ["settings.css","settings-extras.css"]){
    const source=stripCssComments(css(file));
    for(const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
      const selector=match[1],decl=match[2];
      // The canvas has a :not([data-glm-settings-row]) guard and is
      // deliberately a solid dark color, not a field.
      if(!rowSelector.test(selector) ||
         selector.includes("[data-glm-settings-main] > :where(div:not("))continue;
      const focused=/(?:\.gpfocus|:focus-visible|:focus-within|:hover|\[aria-selected="true"\])/.test(
        selector.replaceAll(":not(.gpfocus)","").replaceAll(":not(:hover)",""));
      if(focused)continue;
      checked++;
      for(const painted of decl.matchAll(/\bbackground(?:-color)?\s*:\s*([^;]+);/g)){
        const value=painted[1].trim();
        assert.equal(value,"transparent !important",
          file+" still colors an idle row: "+selector.replace(/\s+/g," ").slice(0,140));
      }
    }
  }
  assert.ok(checked>=12,"Must audit all old normal-field and marker fallback rules");
  const css0=css("settings-extras.css");
  for(const pseudo of [
    "[data-glm-settings-row]::before",
    "[data-glm-settings-row]::after",
    "[data-glm-settings-row-part]::before",
    "[data-glm-settings-row-part]::after",
  ])assert.ok(css0.includes(pseudo),"Native pseudo paint still visible: "+pseudo);
  assert.ok(css0.includes("background-color:transparent !important;"));
  assert.ok(css("settings.css").includes("border-bottom:1px solid transparent !important;"));
  assert.doesNotMatch(css("buttons.css"),/gamepaddialog_Field_S-_La:hover/,
    "Idle rows should not light up under a stationary mouse cursor");
});

test("Recompiled Steam CSS is swapped without a native-color gap",()=>{
  const runtime=readFileSync(new URL("../src/builtinThemeRuntime.ts",import.meta.url),"utf8");
  const apply=runtime.slice(runtime.indexOf("async function applyToTab("),
    runtime.indexOf("async function syncTheme("));
  assert.ok(apply.includes("if(!previous){"),"First install cleanup only");
  assert.ok(!apply.includes("await removeKnown(title)"),
    "Never remove a valid active sheet before inserting its replacement");
  assert.ok(apply.indexOf("injectCssIntoTab(title,css)") <
    apply.indexOf("removeCssFromTab(title,previous.cssId)"),
    "Install a replacement before removing the previous CSS");
  assert.ok(apply.includes("managedTabs.set(title,{cssId,scope,signature});"));
});

test("Settings covers both System controls and Internet network lists",()=>{
  const anchors=[
    "gamepadpagedsettings_PagedSettingsDialog_PageContent",
    "gamepaddialog_Field",
    "gamepaddialog_FieldDescription",
    "gamepaddropdown_DropDownControlButton",
    "gamepaddialog_ToggleRail",
    "gamepadslider_SliderTrackActive",
    "networksettings_NetworkItem",
    "networksettings_NetworkListItem",
    "networksettings_Connected",
    "wifisettings_NetworkItem",
    'role="listbox"',
    'role="listitem"',
  ];
  for(const anchor of anchors)assert.ok(settings.includes(anchor),anchor);
  assert.ok(settings.includes(".gpfocus"),"Controller focus is styled");
  assert.ok(settings.includes("aria-selected"),"Selected list items styled");
  assert.ok(settings.includes("html[data-glm-settings-root] [data-glm-settings-main] {") &&
    settings.includes("--glm-settings-canvas:#0a1b30;") &&
    settings.includes("--glm-settings-section:#0f2842;"),
    "Settings content and rows share the Midnight 0.4.3 palette");
  for(const marker of ["data-glm-settings-sidebar","data-glm-settings-main"])
    assert.ok(settings.includes(marker),"Steam Settings pane fallback: "+marker);
  for(const marker of ["data-glm-settings-root","data-glm-settings-row",
    "data-glm-settings-navitem","data-glm-settings-row-part"])
    assert.ok(settings.includes(marker),"Hashed Steam Settings fallback: "+marker);
});

test("Storage and System reuse a consistent scoped Midnight palette",()=>{
  const native=css("settings.css");
  for(const [name,color] of [
    ["--glm-settings-sidebar","#081425"],
    ["--glm-settings-canvas","#0a1b30"],
    ["--glm-settings-section","#0f2842"],
    ["--glm-settings-control","#123452"],
    ["--glm-settings-focus","#163a5e"],
  ])assert.ok(settings.includes(name+":"+color+";"),name);
  assert.ok(native.includes("background:#0a1b30 !important"),"Semantic native Settings");
  for(const anchor of ["contentmanagement_ContentManagement",
    "contentmanagement_AppsGrid","contentmanagement_InstallFolder",
    "contentmanagement_AppBody","contentmanagement_DriveUsageIndicator"])
    assert.ok(settings.includes(anchor),anchor);
  assert.ok(settings.includes("html[data-glm-settings-root]"),"Settings-only scope");
  assert.doesNotMatch(stripCssComments(css("shared.css")),
    /(?:#GamepadUI_Full_Root|\.BasicUI)\s*\{\s*background(?:-color)?\s*:/);
  assert.doesNotMatch(stripCssComments(settings),
    /(?:^|[\s,])(?:img|video)\s*\{/i,"Keep native Steam artwork");
});
test("Steam game details include Media Notes Activity pills and action buttons",()=>{
  const anchors=[
    "appdetailsnotessection_NoteLink",
    "appdetailsnotessection_NotesSection",
    "appdetailsmedialibrary_MediaLibraryButton",
    "appdetailsmediasection_MediaButton",
    "appdetailscommunityfeed_ActivityFeed",
    "appdetailsplaysection_MenuButton",
    "appdetailsplaysection_OptionsButton",
    "appdetailsplaysection_Stats",
    "appdetailsgameinfopanel_Badge",
    "appdetailssection_Tab",
  ];
  for(const anchor of anchors)assert.ok(games.includes(anchor),anchor);
  assert.ok(games.includes(":focus-visible"));
});

test("theme stays scoped and does not hide or replace Steam artwork or navigation",()=>{
  for (const source of [settings,games]){
    const clean=stripCssComments(source);
    for(const disallowed of [
      /display\s*:\s*none\s*!important/i,
      /pointer-events\s*:\s*none/i,
      /position\s*:\s*fixed/i,
      /(?:^|[\s,])img(?:\s|\[|\{|:)/i,
      /(?:^|[\s,])video(?:\s|\[|\{|:)/i,
    ]) assert.doesNotMatch(clean,disallowed);
    assert.ok(clean.includes(".BasicUI "),"CSS must scope to Steam Game Mode");
  }
});

test("Midnight palette has high contrast for Settings and notes",()=>{
  const rgb=(hex)=>[0,2,4].map(i=>parseInt(hex.slice(1+i,3+i),16)/255)
    .map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
  const lum=(hex)=>rgb(hex).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const contrast=(fg,bg)=>{
    const a=lum(fg),b=lum(bg);
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  };
  assert.ok(contrast("#f2f8ff","#10273f")>=7);
  assert.ok(contrast("#4ac1ff","#10273f")>=4.5);
});

test("0.4.2 forces replacement of earlier cached style revision",()=>{
  const runtime=readFileSync(new URL("../src/builtinThemeRuntime.ts",import.meta.url),"utf8");
  assert.match(runtime,/STYLE_REVISION\s*=\s*"61"/);
  assert.match(runtime,/CLEANUP_SCRIPT/);
});
