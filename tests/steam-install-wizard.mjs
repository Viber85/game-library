import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  requestNativeSteamInstallWizard,STEAM_LOCAL_INSTALL_CLIENT_ID
} from "../src/nativeSteamInstallCore.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const details=read("src/SteamGameDetails.tsx");
const adapter=read("src/steamInstallWizard.ts");

test("Install invokes Steam's own InstallApp store for precisely the selected AppID",()=>{
  const calls=[];
  const store={
    m_unAppIDExpectedInstall:0,
    InstallApp(id,client){calls.push({id,client,thisValue:this});}
  };
  const client={Installs:{OpenInstallWizard(){throw Error("store call must be preferred");}}};
  assert.deepEqual(requestNativeSteamInstallWizard(1091500,false,store,client),
    {opened:true,method:"steam-ui-store"});
  assert.deepEqual(calls,[{id:1091500,client:"0",thisValue:store}]);
  assert.equal(STEAM_LOCAL_INSTALL_CLIENT_ID,"0");
});

test("when UI InstallApp store is absent, use SteamClient.Installs.OpenInstallWizard",()=>{
  const calls=[];
  const installs={OpenInstallWizard(ids,localClientId){
    calls.push({ids,localClientId,thisValue:this});
  }};
  assert.deepEqual(requestNativeSteamInstallWizard(1091500,false,null,{Installs:installs}),
    {opened:true,method:"steam-installs"});
  assert.deepEqual(calls,[{ids:[1091500],localClientId:"0",thisValue:installs}]);
});

test("InstallApp errors fallback to native wizard without routing to old Steam details",()=>{
  const calls=[];
  const store={InstallApp(){throw Error("store not ready");}};
  const client={Installs:{OpenInstallWizard(ids,clientId){calls.push([ids,clientId]);}}};
  assert.deepEqual(requestNativeSteamInstallWizard(730,false,store,client),
    {opened:true,method:"steam-installs"});
  assert.deepEqual(calls,[[[730],"0"]]);
});

test("invalid AppIDs and non-Steam shortcuts cannot reach Steam's installer",()=>{
  let calls=0;
  const store={InstallApp(){calls++;}};
  const client={Installs:{OpenInstallWizard(){calls++;}}};
  for(const id of [0,-1,NaN,Infinity,1.5,2**32,"1091500",null])
    assert.deepEqual(requestNativeSteamInstallWizard(id,false,store,client),
      {opened:false,reason:"invalid-app"},String(id));
  for(const id of [0x80000000,0xffffffff])
    assert.deepEqual(requestNativeSteamInstallWizard(id,false,store,client),
      {opened:false,reason:"non-steam"},String(id));
  assert.deepEqual(requestNativeSteamInstallWizard(730,true,store,client),
    {opened:false,reason:"non-steam"});
  assert.equal(calls,0);
});

test("without a native install API, fail visibly instead of silently opening original Details",()=>{
  assert.deepEqual(requestNativeSteamInstallWizard(730,false,null,{}),
    {opened:false,reason:"unavailable"});
  assert.deepEqual(requestNativeSteamInstallWizard(730,false,{
    InstallApp(){throw Error("failed");}
  },{Installs:{OpenInstallWizard(){throw Error("failed");}}}),
  {opened:false,reason:"request-failed"});
});

test("Game Details Install opens native wizard and retains same Game Details page",()=>{
  assert.match(details,/import \{openSteamInstallWizard\} from "\.\/steamInstallWizard"/);
  const action=details.slice(details.indexOf("const action=()=>{"),
    details.indexOf("  // The native Uninstall dialog",details.indexOf("const action=()=>{")));
  assert.match(action,/if\(installMode==="play"\)\{\s*play\(\{\.\.\.game,installed:true\}\)/);
  assert.match(action,/if\(installMode==="transfer"\)\{/);
  assert.match(action,/const result=openSteamInstallWizard\(game\.id,game\.nonSteam\)/);
  assert.match(action,/if\(result\.opened\)\{setWizardPending\(true\);return;\}/);
  assert.match(action,/toaster\.toast\(\{title:"Install unavailable"/);
  assert.doesNotMatch(action,/onNativeDetails\(\)|openDetails\(|Navigation\.Navigate/);
  assert.match(details,/onActivate=\{action\}/);
  assert.match(details,/Steam's drive selection and confirmation dialog/);
  assert.match(details,/setInstallState\(v=>v===current\.installed\?v:current\.installed\)/);
});

test("adapter calls verified Steam UI InstallApp and falls back to documented native Installs API",()=>{
  assert.match(adapter,/findModuleChild\(/);
  assert.match(adapter,/m_unAppIDExpectedInstall/);
  assert.match(adapter,/typeof found\.InstallApp==="function"/);
  assert.match(adapter,/requestNativeSteamInstallWizard\(/);
  assert.doesNotMatch(adapter,/Navigate\(|onNativeDetails|steam:\/\/install|ContinueInstall\(|SetInstallFolder\(/);
  const source=read("src/nativeSteamInstallCore.ts");
  assert.match(source,/OpenInstallWizard/);
  assert.doesNotMatch(source,/ContinueInstall\(/);
  assert.doesNotMatch(source,/SetInstallFolder\(/);
});
