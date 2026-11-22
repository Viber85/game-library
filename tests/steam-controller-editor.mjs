import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {
  controllerSettingsUrl,openControllerFromClient,controllerEditorScript
} from "../src/steamControllerEditorCore.ts";

test("Steam Input icon requests the actual per-game Controller Settings page",()=>{
  const urls=[];
  const api={ExecuteSteamURL(url){
    assert.equal(this,api);
    urls.push(url);
  }};
  assert.equal(openControllerFromClient(1091500,{URL:api}),true);
  assert.deepEqual(urls,["steam://controllerconfig/1091500"]);
  assert.equal(controllerSettingsUrl(1091500),"steam://controllerconfig/1091500");
});

test("validates AppID and refuses unrelated Steam Settings or context menu",()=>{
  for(const invalid of [0,-1,2**32,1.25,NaN,"1091500","1091500;alert(1)"]){
    assert.throws(()=>controllerSettingsUrl(invalid));
    assert.equal(openControllerFromClient(invalid,{URL:{ExecuteSteamURL(){
      throw Error("invalid should not invoke");
    }}}),false);
  }
  assert.equal(openControllerFromClient(1091500,null),false);
  assert.equal(openControllerFromClient(1091500,{}),false);
  assert.equal(openControllerFromClient(1091500,{URL:{ExecuteSteamURL(){
    throw Error("unavailable");
  }}}),false);
});

test("CEF fallback executes the same verified controllerconfig deep link",()=>{
  const calls=[];
  const script=controllerEditorScript(1091500);
  assert.equal(vm.runInNewContext(script,{globalThis:{SteamClient:{
    URL:{ExecuteSteamURL:url=>calls.push(url)}
  }}}),true);
  assert.deepEqual(calls,["steam://controllerconfig/1091500"]);
  assert.equal(vm.runInNewContext(script,{globalThis:{SteamClient:{URL:{}}}}),false);
  assert.equal(vm.runInNewContext(script,{globalThis:{}}),false);
  assert.doesNotMatch(script,/ShowControllerConfigurator|OpenAppSettingsDialog/);
});

test("on demand prefers Steam URL then enumerated CEF context without spoofing Start menu",()=>{
  const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
  const adapter=read("src/steamControllerEditor.ts");
  const page=read("src/SteamGameDetails.tsx");
  const core=read("src/steamControllerEditorCore.ts");
  const urlAt=adapter.indexOf("if(openControllerFromClient(appId,client))return true;");
  const tabsAt=adapter.indexOf("const getTabs=");
  assert.ok(urlAt>0&&tabsAt>urlAt,"URL call must precede CEF fallback");
  assert.match(adapter,/identifySteamTabs\(listed\)/);
  assert.match(adapter,/fallbackMainTitlesPresent\(listed\)/);
  assert.match(adapter,/execute\(title,false,script\)/);
  assert.match(adapter,/result.success&&result.result===true/);
  assert.match(core,/steam:\/\/controllerconfig\//);
  assert.match(page,/openSteamControllerEditor\(game\.id\)/);
  const action=page.slice(page.indexOf("const openController="),
    page.indexOf("const action=",page.indexOf("const openController=")));
  assert.doesNotMatch(action,/showNativeGameOptions\(|onNativeDetails\(/);
  assert.match(action,/Controller Settings unavailable/);
  const gear=page.slice(page.indexOf("const openGameOptions="),
    page.indexOf("const openController="));
  assert.match(gear,/showNativeGameOptions\(game\.id,anchor\)/);
});
