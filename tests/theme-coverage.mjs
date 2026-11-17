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
    "downloads.css","dialogs.css","qam.css","menus.css"])
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

test("QAM focused icons match library rail without a clipped outer shadow",()=>{
  const qam=stripCssComments(css("qam.css"));
  assert.ok(qam.includes('#QuickAccess-Menu [role="tab"]'),"Accessible tab scope");
  assert.ok(qam.includes(".quickaccessmenu_Tab_1S76C"),"Native QAM class");
  assert.ok(qam.includes("border-radius:12px !important"),"Rail's rounded-square shape");
  assert.ok(qam.includes("background:linear-gradient(140deg,#185488,#083058)"),
    "Same focused background as library rail");
  assert.ok(qam.includes("box-shadow:inset 0 0 0 2px #63cfff,inset 4px 0 0 #4ac1ff"),
    "Focus ring fits completely inside its tab");
  assert.ok(qam.includes("aria-selected=\"true\""),"Selected and focused remain distinct");
  assert.doesNotMatch(qam,/0 0 0 2px var\(--glm-accent\)/,
    "Never draw the QAM tab border outside clipped parent");
  assert.ok(qam.includes(".gpfocuswithin"),"QAM focus-within is supported");
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
  assert.match(runtime,/STYLE_REVISION\s*=\s*"49"/);
  assert.match(runtime,/CLEANUP_SCRIPT/);
});
