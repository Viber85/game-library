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
  assert.doesNotMatch(css,/\b(?:position|display|visibility|z-index|pointer-events|width|height|transform)\s*:/,
    "Never move/hide Steam's buttons or change their focus order");
  assert.doesNotMatch(css,/\b(?:img|svg|video|canvas)\s*(?:\{|\[|:)/,
    "Do not filter/replace native Steam and Non-Steam game artwork");
});

test("Steam Input summary and editable configurator use palette without changing mappings",()=>{
  const css=cleanup(input);
  for(const anchor of [
    "controllerconfiguratorsummary_ControllerConfiguratorSummary",
    "controllerconfiguratorsummary_ControlsListSection",
    "controllerconfiguratorsummary_StandardControl",
    "controllerconfiguratorsummary_ConfigButton",
    "controllerconfiguratorsummary_DirectAccessButton",
    "controllerconfigurator_ControllerConfiguratorMain",
    "controllerconfigurator_CurrentConfigurationButton",
    "controllerconfiguratorchooseconfiguration_ConfigurationButton",
  ])assert.ok(css.includes(anchor),anchor);
  assert.match(css,/background:linear-gradient\(180deg,#0a1b30/);
  assert.match(css,/background:#1d527d !important;/);
  assert.match(css,/box-shadow:inset 0 0 0 2px #63cfff !important;/);
  assert.doesNotMatch(css,/(?:#GamepadUI_Full_Root|\.BasicUI|\bbody\b|\bhtml\b)\s*\{/,
    "Global roots used for transient Steam popups must not be painted");
  assert.doesNotMatch(css,/\b(?:position|display|visibility|z-index|pointer-events|width|height|transform|filter)\s*:/,
    "The controller diagram, mapping, button layout, and UI geometry remain native");
  assert.doesNotMatch(css,/\b(?:img|svg|video|canvas|path)\s*(?:\{|\[|:)/,
    "Steam Input button glyphs and images must not be recolored");
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
  assert.match(runtime,/STYLE_REVISION\s*=\s*"74"/);
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
