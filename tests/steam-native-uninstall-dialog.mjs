import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {requestSteamUninstallLink} from "../src/nativeSteamUninstallUrl.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Cancel dispatches the exact Steam URL protocol to its own client",()=>{
  const calls=[];
  const client={URL:{ExecuteSteamURL:(url)=>{calls.push(url);}}};
  assert.deepEqual(requestSteamUninstallLink(730,false,client),{sent:true});
  assert.deepEqual(calls,["steam://uninstall/730"]);
  // Function does not return a deletion-confirmed flag.
});

test("invalid app IDs and non-Steam shortcuts cannot invoke uninstall",()=>{
  const calls=[];
  const client={URL:{ExecuteSteamURL:(url)=>calls.push(url)}};
  for(const appId of [-1,0,NaN,2.5,0x80000000]){
    assert.deepEqual(requestSteamUninstallLink(appId,false,client),
      {sent:false,reason:"invalid-app"});
  }
  assert.deepEqual(requestSteamUninstallLink(730,true,client),
    {sent:false,reason:"invalid-app"});
  assert.deepEqual(calls,[]);
});

test("unavailable or failed native URL handling is explicitly reported",()=>{
  assert.deepEqual(requestSteamUninstallLink(730,false,null),
    {sent:false,reason:"unavailable"});
  assert.deepEqual(requestSteamUninstallLink(730,false,{URL:{}}),
    {sent:false,reason:"unavailable"});
  const original=console.warn;
  console.warn=()=>{};
  try{
    assert.deepEqual(requestSteamUninstallLink(730,false,
      {URL:{ExecuteSteamURL(){throw Error("Steam rejected");}}}),
      {sent:false,reason:"failed"});
  }finally{console.warn=original;}
});

test("Cancel button requests direct native Steam protocol without embedding private modal",()=>{
  const details=read("src/SteamGameDetails.tsx");
  const helper=read("src/nativeSteamUninstallUrl.ts");
  const menu=read("src/nativeGameContextMenu.tsx");
  const start=details.indexOf("  const confirmCancelDownload=()=>");
  const end=details.indexOf("  const showCommunity=()=>",start);
  const cancel=details.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(cancel,/if\(nativeDownload\.downloadNature==="initial"\)/);
  assert.match(cancel,/requestSteamUninstallLink\(game\.id,game\.nonSteam,client\.SteamClient\)/);
  assert.match(cancel,/if\(result\.sent\)/);
  assert.match(cancel,/showNativeGameOptions\(game\.id,anchor\)/);
  assert.match(helper,/steam:\/\/uninstall\//);
  assert.doesNotMatch(helper,/SteamClient\.Installs\.OpenUninstallWizard\(/);
  assert.doesNotMatch(details,/showNativeSteamUninstallDialog/);
  assert.match(menu,/showContextMenu\(element,target,opts\)/);
  // After the initial branch, updates still use their queue-only confirmation.
  assert.match(cancel,/strTitle="Remove Steam download from queue\?"/);
  assert.doesNotMatch(cancel,/void cancelDownload\("initial"\)/);
});

test("Steam URL is only a request; prefix cleanup still waits for actual uninstall",()=>{
  const details=read("src/SteamGameDetails.tsx");
  const request=details.indexOf("requestSteamUninstallLink(");
  const cleanup=details.indexOf("  const inspectPrefixCleanup=");
  const cancel=details.indexOf("  const confirmCancelDownload=()=>");
  assert.ok(request>cleanup&&request>cancel);
  assert.match(details,/if\(!awaitingSteamUninstall\|\|nativeDownload\.transfer/);
  assert.match(details,/inspectPrefixCleanup\(game\.id\)/);
  assert.match(details,/cleanupCancelledSteamGame\(appid\)/);
});
