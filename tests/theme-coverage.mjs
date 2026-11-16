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
    settings.includes("background:#0c1b32 !important;"),
    "Settings scroll canvas matches row blue");
  for(const marker of ["data-glm-settings-sidebar","data-glm-settings-main"])
    assert.ok(settings.includes(marker),"Steam Settings pane fallback: "+marker);
  for(const marker of ["data-glm-settings-root","data-glm-settings-row",
    "data-glm-settings-navitem","data-glm-settings-row-part"])
    assert.ok(settings.includes(marker),"Hashed Steam Settings fallback: "+marker);
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
  assert.match(runtime,/STYLE_REVISION\s*=\s*"45"/);
  assert.match(runtime,/CLEANUP_SCRIPT/);
});
