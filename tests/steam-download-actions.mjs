import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {nativeDownloadAction,readSteamDownloadNature}
  from "../src/steamDownloadActionsCore.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Steam's real flags distinguish initial installs from updates",()=>{
  const overview={update_appid:730,update_state:"Downloading",update_is_install:true};
  const rows=[{remote_client_id:"0",item_data:[
    {appid:730,completed:false,active:true,buildid:0,queue_index:0}
  ]}];
  assert.equal(readSteamDownloadNature(730,rows,overview),"initial");
  assert.equal(readSteamDownloadNature(730,rows,
    {...overview,update_is_install:false}),"update");
  assert.equal(readSteamDownloadNature(730,rows,null),"initial");
  assert.equal(readSteamDownloadNature(730,[{
    ...rows[0],item_data:[{...rows[0].item_data[0],buildid:123456}]
  }],null),"update");
  assert.equal(readSteamDownloadNature(730,[],null),"unknown");
  assert.equal(readSteamDownloadNature(730,[{
    remote_client_id:"74",item_data:[{appid:730,active:true,buildid:0}]
  }],null),"unknown");
});

test("Pause and Resume affect only the selected local Steam AppID",async()=>{
  const calls=[];
  const downloads={
    PauseAppUpdate:(...args)=>calls.push(["pause",...args]),
    ResumeAppUpdate:(...args)=>calls.push(["resume",...args])
  };
  assert.deepEqual(await nativeDownloadAction("pause",730,false,"initial",downloads),
    {ok:true,uninstallRequested:false});
  assert.deepEqual(await nativeDownloadAction("resume",730,false,"initial",downloads),
    {ok:true,uninstallRequested:false});
  assert.deepEqual(calls,[["pause",730,"0"],["resume",730,"0"]]);
});

test("Cancel initial install invokes the native Steam Uninstall confirmation directly",async()=>{
  const calls=[];
  const downloads={
    PauseAppUpdate:(...args)=>calls.push(["pause",...args]),
    RemoveFromDownloadList:(...args)=>calls.push(["remove",...args])
  };
  const installs={OpenUninstallWizard:(...args)=>calls.push(["uninstall",...args])};
  assert.deepEqual(await nativeDownloadAction("cancel",730,false,"initial",downloads,installs),
    {ok:true,uninstallRequested:true});
  assert.deepEqual(calls,[["uninstall",[730],true]],
    "Do not pause or remove a new install from queue before the native Uninstall action");
});

test("native Uninstall can open even when Steam rejects Pause and has no Downloads API",async()=>{
  const downloads={PauseAppUpdate:()=>{throw Error("paused");},
    RemoveFromDownloadList:()=>{throw Error("do not call");}};
  const calls=[];
  const installs={OpenUninstallWizard:(...args)=>calls.push(args)};
  assert.deepEqual(await nativeDownloadAction("cancel",730,false,"initial",downloads,installs),
    {ok:true,uninstallRequested:true});
  assert.deepEqual(await nativeDownloadAction("cancel",730,false,"initial",null,installs),
    {ok:true,uninstallRequested:true});
  assert.deepEqual(calls,[[[730],true],[[730],true]]);
});

test("updates and unknown transfers only leave the queue, never uninstall existing content",async()=>{
  for(const kind of ["update","unknown"]){
    const calls=[];
    const downloads={RemoveFromDownloadList:(...args)=>calls.push(["remove",...args])};
    const installs={OpenUninstallWizard:(...args)=>calls.push(["uninstall",...args])};
    assert.deepEqual(await nativeDownloadAction("cancel",730,false,kind,downloads,installs),
      {ok:true,uninstallRequested:false});
    assert.deepEqual(calls,[["remove",730,"0"]]);
  }
});

test("native Uninstall acknowledgement timeout cannot trap controller UI",async()=>{
  const never=new Promise(()=>{});
  const calls=[];
  const installs={OpenUninstallWizard:(...args)=>{
    calls.push(args);return never;
  }};
  const start=Date.now();
  assert.deepEqual(await nativeDownloadAction("cancel",730,false,
    "initial",null,installs,35),{ok:true,uninstallRequested:true});
  assert.deepEqual(calls,[[[730],true]]);
  assert.ok(Date.now()-start<900);
});

test("explicit failures are surfaced and do not claim removal",async()=>{
  assert.deepEqual(await nativeDownloadAction("cancel",730,false,"initial",
    null,{OpenUninstallWizard:()=>Promise.reject(Error("Steam denied"))},35),
    {ok:false,uninstallRequested:false,reason:"failed"});
  assert.deepEqual(await nativeDownloadAction("cancel",730,false,"update",
    {RemoveFromDownloadList:()=>Promise.reject(Error("Steam denied"))},null,35),
    {ok:false,uninstallRequested:false,reason:"failed"});
});

test("shortcuts and invalid app IDs cannot request native removal",async()=>{
  let calls=0;
  const downloads={RemoveFromDownloadList:()=>calls++};
  const installs={OpenUninstallWizard:()=>calls++};
  for(const appId of [0,-1,NaN,1.5,0x80000000]){
    assert.deepEqual(await nativeDownloadAction("cancel",appId,false,"initial",
      downloads,installs),{ok:false,uninstallRequested:false,reason:"invalid-app"});
  }
  assert.deepEqual(await nativeDownloadAction("cancel",730,true,"initial",
    downloads,installs),{ok:false,uninstallRequested:false,reason:"invalid-app"});
  assert.deepEqual(await nativeDownloadAction("cancel",730,false,"initial",
    downloads,null),{ok:false,uninstallRequested:false,reason:"unavailable"});
  assert.equal(calls,0);
});

test("UI uses Steam's own confirmation and delays prefix cleanup until native removal is verified",()=>{
  const src=read("src/SteamGameDetails.tsx");
  const backend=read("main.py");
  const packageScript=read("scripts/package.sh");
  const start=src.indexOf("  const cancelDownload=async(");
  const end=src.indexOf("  const confirmCancelDownload=()=>",start);
  const action=src.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(src,/const initial=nativeDownload\.downloadNature==="initial"/);
  assert.match(src,/strOKButtonText=\{initial\?"Uninstall game":"Remove from queue"\}/);
  assert.match(src,/bDestructiveWarning=\{initial\}/);
  assert.match(src,/showModal\(<ConfirmModal/);
  assert.match(src,/setCancelFeedback\("Uninstall confirmed and sent to Steam/);
  assert.match(src,/if\(!awaitingSteamUninstall\|\|nativeDownload\.transfer/);
  assert.match(src,/inspectPrefixCleanup\(game\.id\)/);
  assert.doesNotMatch(action,/inspectPrefixCleanup\(game\.id\)/,
    "Opening Steam's Uninstall dialog must never immediately delete the prefix");
  assert.match(src,/withRequestTimeout\(cleanupCancelledSteamGame\(appid\),38000\)/);
  assert.match(action,/finally\{\s*busyRef\.current=false;\s*setDownloadBusy\(false\)/);
  assert.match(src,/gl-details-download-feedback/);
  assert.match(src,/role="status"/);
  assert.match(src,/native-uninstall-fallback/);
  assert.match(src,/showNativeGameOptions\(game\.id,anchor\)/);
  assert.match(backend,/async def cleanup_cancelled_steam_game\(self, appid: int\):/);
  assert.match(packageScript,/steam_cancel_cleanup\.py/);
});
