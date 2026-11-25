import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  controllerSettingsRoute,openControllerSettingsRoute
} from "../src/steamControllerEditorCore.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Controller Settings uses Steam GamepadUI's native Main route, not edit layout",()=>{
  assert.equal(controllerSettingsRoute(1091500),"/app/1091500/controllerconfigurator/main");
  assert.equal(controllerSettingsRoute(42420),"/app/42420/controllerconfigurator/main");
  assert.doesNotMatch(controllerSettingsRoute(1091500),/steam:\/\/controllerconfig\//);
  assert.doesNotMatch(controllerSettingsRoute(1091500),/\/buttons$|\/actionsets$/);
});

test("validated numeric AppID only; untrusted strings cannot become native routes",()=>{
  for(const bad of [0,-1,2**32,1.25,NaN,Infinity,"1091500","123;alert(1)",null]){
    assert.throws(()=>controllerSettingsRoute(bad));
    assert.equal(openControllerSettingsRoute(bad,()=>{throw Error("must not navigate");}),false);
  }
});

test("exactly one native Game Mode navigation; no fake controller press or URL dialog",()=>{
  const calls=[];
  assert.equal(openControllerSettingsRoute(1091500,route=>calls.push(route)),true);
  assert.deepEqual(calls,["/app/1091500/controllerconfigurator/main"]);
  assert.equal(openControllerSettingsRoute(1091500,()=>{throw Error("navigation unavailable");}),false);
});

test("React adapter uses Decky Navigation.Navigate and preserves original native history",()=>{
  const adapter=read("src/steamControllerEditor.ts");
  const core=read("src/steamControllerEditorCore.ts");
  const page=read("src/SteamGameDetails.tsx");
  assert.match(adapter,/Navigation\.Navigate\(route\)/);
  assert.match(adapter,/openControllerSettingsRoute\(appId,navigate\)/);
  assert.doesNotMatch(adapter,/ExecuteSteamURL|fetchNoCors|executeInTab|ShowControllerConfigurator/);
  assert.match(core,/\/controllerconfigurator\/main/);
  assert.doesNotMatch(core,/ExecuteSteamURL|ShowControllerConfigurator/);
  const dashboard=read("src/Dashboard.tsx");
  assert.ok(page.includes("onOpenControllerSettings:()=>void;"));
  assert.match(page,/const openController=onOpenControllerSettings/);
  assert.match(dashboard,/void openSteamControllerEditor\(game\.id\)/);
  const action=page.slice(page.indexOf("const openController="),
    page.indexOf("const action=",page.indexOf("const openController=")));
  assert.doesNotMatch(action,/showNativeGameOptions\(|onNativeDetails\(/);
  const gear=page.slice(page.indexOf("const openGameOptions="),
    page.indexOf("const openController="));
  assert.match(gear,/showModal\(<UnifiedGameContextMenu/);
});

test("production route matches Steam GamepadUI ControllerConfigurator.Main path",()=>{
  // Independently checked against Steam's route generator 37449.js.
  const core=read("src/steamControllerEditorCore.ts");
  assert.match(core,/ClientRoutes\.GamepadUI\.ControllerConfigurator\.Main/);
  assert.equal(controllerSettingsRoute(1091500),"/app/1091500/controllerconfigurator/main");
});
