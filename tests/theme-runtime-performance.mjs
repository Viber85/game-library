import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createThemeAliasCache,sameThemeRuntimeStatus} from "../src/themeCycleCache.ts";
import {expandThemeClassAliases} from "../src/themeClassAliases.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const source='.BasicUI [class*="gamepadpagedsettings_PagedSettingsDialog_PageContent"] [class*="gamepaddialog_Field"] { background:#0c1b32; }';

test("unchanged lazy-loaded Steam CSS aliases reuse the expanded stylesheet",()=>{
  let expansions=0;
  const compile=createThemeAliasCache((css,modules)=>{
    expansions++;
    return css+"\n"+(modules.gamepaddialog?.Field??"none");
  });
  const modules={gamepaddialog:{Field:"_steamFieldA"}};
  const first=compile(source,modules);
  assert.strictEqual(first,compile(source,{gamepaddialog:{Field:"_steamFieldA"}}));
  assert.equal(expansions,1,"Same alias should not re-expand 60KB of CSS each check");
  assert.notEqual(first,compile(source,{gamepaddialog:{Field:"_steamFieldB"}}));
  assert.equal(expansions,2);
});

test("missing module is detected when Settings or Game Details lazy-loads it",()=>{
  const compile=createThemeAliasCache(expandThemeClassAliases);
  const old=compile(source,{});
  assert.ok(old.includes('[class*="gamepaddialog_Field"]'));
  const first=compile(source,{
    gamepaddialog:{Field:"_steamFieldA"},
    gamepadpagedsettings:{PagedSettingsDialog_PageContent:"_steamPageA"},
  });
  assert.match(first,/\[class~="_steamFieldA"\]/);
  assert.match(first,/\[class~="_steamPageA"\]/);
  assert.notEqual(first,old);
  const second=compile(source,{
    gamepaddialog:{Field:"_steamFieldB"},
    gamepadpagedsettings:{PagedSettingsDialog_PageContent:"_steamPageA"},
  });
  assert.match(second,/\[class~="_steamFieldB"\]/);
  assert.doesNotMatch(second,/\[class~="_steamFieldA"\]/);
  // A module that unloads must also be removed from the expanded stylesheet.
  assert.equal(compile(source,{}),old);
});

test("source content changes and unused aliases never suppress real updates",()=>{
  let expansions=0;
  const compile=createThemeAliasCache((css)=>{expansions++;return css;});
  compile(source,{});
  compile(source,{appdetails:{ScrollContainer:"_unused1"}});
  assert.equal(expansions,1,"Unreferenced Steam modules cannot change this stylesheet");
  compile(source+" /* new css */",{});
  assert.equal(expansions,2);
});

test("all known native status fields contribute to a visible status update",()=>{
  const current={selected:"midnight",appliedTabs:3,hasMain:true,hasMenu:true,hasQAM:true,issue:""};
  assert.equal(sameThemeRuntimeStatus(current,{...current}),true);
  for(const [key,value] of Object.entries({
    selected:"off",appliedTabs:2,hasMain:false,hasMenu:false,hasQAM:false,issue:"missing",
  })){
    assert.equal(sameThemeRuntimeStatus(current,{...current,[key]:value}),false,key);
  }
});

test("runtime scans live Steam CSS aliases once per sync, still verifies every tab",()=>{
  const runtime=read("src/builtinThemeRuntime.ts");
  const compiler=read("src/themeCssCompiler.ts");
  assert.match(runtime,/const compile=tabs\.length\?createMidnightCssCompiler\(\):null/);
  assert.match(runtime,/const cssByScope=new Map<ThemeScope,string>\(\)/);
  assert.match(runtime,/cssByScope\.set\(tab\.scope,css\)/);
  assert.match(runtime,/await applyToTab\(tab\.title,tab\.scope,epoch,css\)/);
  assert.match(runtime,/const signature=cssSignature\(css\)/);
  assert.match(runtime,/await activeInTab\(title\)/);
  assert.match(runtime,/await bounded\(injectCssIntoTab\(title,css\)/);
  assert.match(runtime,/await bounded\(removeCssFromTab\(title,previous\.cssId\)/);
  assert.match(runtime,/await syncCompactDetailsDom\(title,compactDetails\)/);
  assert.match(runtime,/await ensureThemeAudit\(title\)/);
  assert.match(runtime,/const RECHECK_MS = 6500/);
  assert.match(runtime,/const STYLE_REVISION = "82"/);
  assert.match(compiler,/const modules=getSteamModules\(\)/);
  assert.match(compiler,/const compileWithCache=createThemeAliasCache\(expandThemeClassAliases\)/);
});

test("focus, native Decky settings and Steam Input CSS remain untouched",()=>{
  const css=read("system-theme/settings-gamepad-focus.css");
  const decky=read("system-theme/decky-settings.css");
  const menu=read("system-theme/menus.css");
  const input=read("system-theme/steam-input.css");
  assert.match(css,/background:#163a5e !important/);
  assert.match(decky,/data-glm-decky-settings/);
  assert.match(menu,/box-shadow:0 0 20px rgba\(3,157,255,\.72\)/);
  assert.doesNotMatch(input.replace(/\/\*[\s\S]*?\*\//g,""),/controllerconfiguratorsummary_/);
});
