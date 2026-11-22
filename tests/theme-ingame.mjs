import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {expandThemeClassAliases} from "../src/themeClassAliases.ts";

const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const menu=file("system-theme/running-menu.css");
const input=file("system-theme/steam-input.css");
const bundle=file("main.py");
const compiler=file("src/themeCssCompiler.ts");
const runtime=file("src/builtinThemeRuntime.ts");
const cleanup=s=>s.replace(/\/\*[\s\S]*?\*\//g,"");

test("native running-game panel is themed, never the entire Steam CEF overlay",()=>{
  const css=cleanup(menu);
  for(const name of [
    "mainmenuapprunning_MainMenuAppRunning",
    "mainmenuapprunning_NavigationColumn",
    "mainmenuapprunning_AppColumn",
    "mainmenuapprunning_ScrollMask",
    "mainmenuapprunning_NavigationMenuItem",
    "mainmenuapprunning_FocusedColumn",
  ])assert.ok(css.includes(name),name);
  assert.match(css,/linear-gradient\(180deg,#102a47/);
  assert.match(css,/background:#163a5e !important;/);
  assert.match(css,/\.gpfocus,\.gpfocuswithin,:focus-visible/);
  assert.doesNotMatch(css,/\b(?:background|border|color)\s*:\s*[^;]*\b(?:red|magenta)\b/i);
  assert.doesNotMatch(css,/(?:#GamepadUI_Full_Root|\.BasicUI|\bbody\b|\bhtml\b)\s*\{/,
    "No painting global Steam/volume/achievement overlay surfaces");
  assert.doesNotMatch(css,/\b(?:position|display|visibility|z-index|pointer-events|height|transform|overflow)\s*:/,
    "Never move/hide native panels, hitboxes, Steam scroll mask, or focus handling");
  assert.doesNotMatch(css,/\b(?:img|svg|video|canvas)\s*(?:\{|\[|:)/,
    "Do not filter/replace native Steam and Non-Steam game artwork");
});

test("0.5.1 keeps the complete in-game cyan outline and glow within native scroll bounds",()=>{
  const css=cleanup(menu);
  const nav=css.slice(css.indexOf(":is(.mainmenuapprunning_NavigationBox_36vNU"),
    css.lastIndexOf(":is(.mainmenuapprunning_AppColumn_3FAI9"));
  assert.match(nav,/mainmenuapprunning_NavigationBox/,
    "Never target unrelated Game Mode lists");
  assert.match(nav,/mainmenuapprunning_NavigationMenuItem/,
    "Focus treatment belongs to an individual navigation row");
  assert.match(nav,/margin:8px 22px !important;/,
    "Reserve horizontal room for the 20px bloom without changing the Steam ScrollMask");
  assert.match(nav,/width:calc\(100% - 44px\) !important;/);
  assert.match(nav,/box-sizing:border-box !important;/);
  assert.match(nav,/outline:2px solid #63cfff !important;/);
  assert.match(nav,/outline-offset:-2px !important;/);
  assert.match(nav,/box-shadow:0 0 20px rgba\(3,157,255,\.72\),/);
  for(const state of [".gpfocus",".gpfocuswithin",":focus-visible",":focus-within"])
    assert.ok(nav.includes(state),"Native controller/keyboard focus must be visible: "+state);
  assert.doesNotMatch(nav,/ScrollMask|FocusedColumn|NavigationColumn|\b(?:overflow|padding|transform|position|z-index|pointer-events)\s*:/,
    "Never disable the Steam scroll mask or repaint/outline the whole column");
  assert.doesNotMatch(nav,/\b(?:outline|box-shadow)\s*:[^;]*none\s*!important/,
    "Do not erase the actual focused row glow again");
});

test("Steam Input controller summary is native while its separate editor remains themed",()=>{
  const css=cleanup(input);
  assert.doesNotMatch(css,/controllerconfiguratorsummary_/,
    "The pictured layout overview must not receive any direct Midnight paint");
  for(const anchor of [
    "controllerconfigurator_ControllerConfiguratorMain",
    "controllerconfigurator_CurrentConfigurationButton",
    "controllerconfiguratorchooseconfiguration_ConfigurationButton",
  ])assert.ok(css.includes(anchor),"Editable settings remain themed: "+anchor);
  assert.doesNotMatch(css,/background:linear-gradient\(180deg,#0a1b30/,
    "The formerly themed controller overview gradient is gone");
  assert.match(css,/background:#1d527d !important;/);
  assert.match(css,/box-shadow:inset 0 0 0 2px #63cfff !important;/);
  assert.doesNotMatch(css,/(?:#GamepadUI_Full_Root|\.BasicUI|\bbody\b|\bhtml\b)\s*\{/,
    "Global roots used for transient Steam popups must not be painted");
  assert.doesNotMatch(css,/\b(?:position|display|visibility|z-index|pointer-events|width|height|transform|filter)\s*:/,
    "Controller diagram, mapping and action geometry remain native");
  assert.doesNotMatch(css,/\b(?:img|svg|video|canvas|path)\s*(?:\{|\[|:)/,
    "Steam Input artwork and native glyphs are not recolored");
});

test("Shared buttons/fields opt out of Midnight inside native Steam Input overview",()=>{
  const css=cleanup(file("system-theme/buttons.css"));
  const optOut=':not(:is([class*="controllerconfiguratorsummary_ControllerConfiguratorSummary"] *))';
  for(const name of [
    "button.DialogButton","button.gamepaddialog_Button_1kn70",
    ".gamepaddialog_Field_S-_La",".gamepaddialog_FieldLabel_3b0U-",
    ".gamepaddialog_FieldDescription_2OJfk"
  ])assert.ok(css.includes(name+optOut),
    "Native Steam Input overview must not inherit generic Midnight "+name);
  const compiled=expandThemeClassAliases(css,{
    controllerconfiguratorsummary:{ControllerConfiguratorSummary:"_steamInputHash123"}
  });
  assert.ok(compiled.includes('[class~="_steamInputHash123"]'),
    "Steam's minified controller summary root is excluded too");
  assert.ok(css.includes("button.DialogButton"),
    "Other SteamOS pages retain their existing themed controls");
});


test("Steam Input is bundled into both main/overlay; running menu only into overlay",()=>{
  const before=bundle.indexOf('"main": (');
  const after=bundle.indexOf('"overlay": (');
  const end=bundle.indexOf('    result = {}',after);
  assert.ok(before>=0&&after>before&&end>after);
  const main=bundle.slice(before,after);
  const overlay=bundle.slice(after,end);
  assert.ok(main.includes('"steam-input.css"'));
  assert.ok(!main.includes('"running-menu.css"'),"Do not include native running-game menu CSS in Home");
  assert.ok(overlay.includes('"steam-input.css"'));
  assert.ok(overlay.includes('"running-menu.css"'));
  const menus=overlay.indexOf('"menus.css"');
  const running=overlay.indexOf('"running-menu.css"');
  assert.ok(menus>=0&&running>menus,"The new menu styling should override old panel colors");
});

test("Steam's changing CSS class names are resolved through the same alias compiler",()=>{
  for(const prefix of [
    "mainmenuapprunning","controllerconfiguratorsummary",
    "controllerconfigurator","controllerconfiguratorchooseconfiguration",
  ])assert.ok(compiler.includes(prefix+":["),prefix);
  const source=':is([class*="mainmenuapprunning_AppColumn"],[class*="controllerconfiguratorsummary_ControllerConfiguratorSummary"]){color:var(--glm-text);}';
  const expanded=expandThemeClassAliases(source,{
    mainmenuapprunning:{AppColumn:"_abc123xyz"},
    controllerconfiguratorsummary:{ControllerConfiguratorSummary:"_def456abc"}
  });
  assert.ok(expanded.includes('[class~="_abc123xyz"]'));
  assert.ok(expanded.includes('[class~="_def456abc"]'));
  assert.ok(expanded.includes('var(--glm-text)'));
  assert.match(runtime,/STYLE_REVISION\s*=\s*"87"/);
});

test("native CSS source is syntactically balanced and leaves all selector brackets paired",()=>{
  for(const [name,source] of [["running-menu.css",menu],["steam-input.css",input]]){
    const content=cleanup(source);
    let curly=0,round=0,square=0;
    let quote=null,escaped=false;
    for(const char of content){
      if(quote){
        if(escaped)escaped=false;
        else if(char==="\\")escaped=true;
        else if(char===quote)quote=null;
        continue;
      }
      if(char==='"'||char==="'"){quote=char;continue;}
      if(char==="{")curly++;
      else if(char==="}")curly--;
      else if(char==="(")round++;
      else if(char===")")round--;
      else if(char==="[")square++;
      else if(char==="]")square--;
      assert.ok(curly>=0&&round>=0&&square>=0,name+" unmatched closing selector");
    }
    assert.equal(curly,0,name+" incomplete block");
    assert.equal(round,0,name+" incomplete selector");
    assert.equal(square,0,name+" incomplete class selector");
    assert.equal(quote,null,name+" incomplete string");
  }
});
