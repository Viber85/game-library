import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {
  openControllerFromClient,controllerEditorScript
} from "../src/steamControllerEditorCore.ts";

test("controller icon opens genuine Steam Input configurator for selected game",()=>{
  const calls=[];
  const apps={ShowControllerConfigurator(appId){
    assert.equal(this,apps);
    calls.push(appId);
  }};
  assert.equal(openControllerFromClient(1091500,{Apps:apps}),true);
  assert.deepEqual(calls,[1091500]);
});

test("unsupported Steam client never substitutes game Settings or app Details",()=>{
  assert.equal(openControllerFromClient(1091500,{}),false);
  assert.equal(openControllerFromClient(1091500,null),false);
  assert.equal(openControllerFromClient(0,{Apps:{ShowControllerConfigurator(){throw Error("invalid");}}}),false);
  assert.equal(openControllerFromClient(1091500,{Apps:{ShowControllerConfigurator(){throw Error("unavailable");}}}),false);
});

test("native Steam CEF bridge invokes exact controller configurator, validates numeric AppID",()=>{
  const calls=[];
  const script=controllerEditorScript(1091500);
  assert.equal(vm.runInNewContext(script,{globalThis:{SteamClient:{
    Apps:{ShowControllerConfigurator:id=>calls.push(id)}
  }}}),true);
  assert.deepEqual(calls,[1091500]);
  assert.equal(vm.runInNewContext(script,{globalThis:{SteamClient:{Apps:{}}}}),false);
  assert.equal(vm.runInNewContext(script,{globalThis:{}}),false);
  for(const invalid of [0,-1,2**32,1.25,NaN,"1091500","1091500;alert(1)"])
    assert.throws(()=>controllerEditorScript(invalid));
});

test("on-demand fallback searches actual Steam CEF tabs; no wrong route navigation",()=>{
  const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
  const adapter=read("src/steamControllerEditor.ts");
  const page=read("src/SteamGameDetails.tsx");
  assert.match(adapter,/identifySteamTabs\(listed\)/);
  assert.match(adapter,/fallbackMainTitlesPresent\(listed\)/);
  assert.match(adapter,/execute\(title,false,script\)/);
  assert.match(adapter,/result\.success&&result\.result===true/);
  assert.match(page,/openSteamControllerEditor\(game\.id\)/);
  const action=page.slice(page.indexOf("const openController="),
    page.indexOf("const action=",page.indexOf("const openController=")));
  assert.doesNotMatch(action,/onNativeDetails/);
  assert.doesNotMatch(adapter,/Navigation\.Navigate\(|NavigateToSteamWeb|openDetails\(/);
});
