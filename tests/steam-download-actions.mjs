import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {nativeDownloadAction,readSteamDownloadNature}
  from "../src/steamDownloadActionsCore.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("native Steam initial install classification uses real update_is_install and buildid",()=>{
  const active={update_appid:730,update_state:"Downloading",update_is_install:true};
  const rows=[{remote_client_id:"0",item_data:[
    {appid:730,completed:false,active:true,buildid:0,queue_index:0}
  ]}];
  assert.equal(readSteamDownloadNature(730,rows,active),"initial");
  assert.equal(readSteamDownloadNature(730,rows,{
    ...active,update_is_install:false
  }),"update");
  assert.equal(readSteamDownloadNature(730,rows,null),"initial");
  assert.equal(readSteamDownloadNature(730,[{
    ...rows[0],item_data:[{...rows[0].item_data[0],buildid:123456}]
  }],null),"update");
  assert.equal(readSteamDownloadNature(730,[],null),"unknown");
  assert.equal(readSteamDownloadNature(730,[{
    remote_client_id:"74",item_data:[{appid:730,active:true,buildid:0}]
  }],null),"unknown");
});

test("Pause and Resume affect only one AppID, on Steam's local client",async()=>{
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

test("cancel fresh install uses Steam queue removal and no-prompt native uninstall",async()=>{
  const calls=[];
  const downloads={
    PauseAppUpdate:(...args)=>{calls.push(["pause",...args]);},
    RemoveFromDownloadList:(...args)=>{calls.push(["remove",...args]);}
  };
  const installs={
    OpenUninstallWizard:(...args)=>calls.push(["uninstall",...args])
  };
  assert.deepEqual(await nativeDownloadAction("cancel",730,false,"initial",downloads,installs),
    {ok:true,uninstallRequested:true});
  assert.deepEqual(calls,[["pause",730,"0"],["remove",730,"0"],
    ["uninstall",[730],true]]);
});

test("updates and unverified installs never trigger uninstall or prefix deletion",async()=>{
  for(const nature of ["update","unknown"]){
    let uninstallCalls=0;
    const downloads={
      PauseAppUpdate:()=>{},
      RemoveFromDownloadList:()=>{}
    };
    const installs={OpenUninstallWizard:()=>{uninstallCalls++;}};
    assert.deepEqual(await nativeDownloadAction("cancel",730,false,
      nature,downloads,installs),{ok:true,uninstallRequested:false});
    assert.equal(uninstallCalls,0);
  }
});

test("cancel still removes queued install when Steam's Pause API throws",async()=>{
  const calls=[];
  const downloads={
    PauseAppUpdate:()=>{calls.push("pause");throw Error("cannot pause queued item");},
    RemoveFromDownloadList:(id,client)=>calls.push(["remove",id,client])
  };
  const installs={OpenUninstallWizard:(ids,confirmed)=>calls.push(["uninstall",ids,confirmed])};
  assert.deepEqual(await nativeDownloadAction("cancel",730,false,
    "initial",downloads,installs),{ok:true,uninstallRequested:true});
  assert.deepEqual(calls,["pause",["remove",730,"0"],["uninstall",[730],true]]);
});

test("cancel without Pause API can still remove a queued transfer",async()=>{
  const calls=[];
  const downloads={RemoveFromDownloadList:(id,client)=>calls.push([id,client])};
  assert.deepEqual(await nativeDownloadAction("cancel",730,false,
    "update",downloads,null),{ok:true,uninstallRequested:false});
  assert.deepEqual(calls,[[730,"0"]]);
});

test("a never-resolving Steam Promise cannot trap Cancel in Working",async()=>{
  const calls=[];
  const never=new Promise(()=>{});
  const downloads={
    PauseAppUpdate:()=>{calls.push("pause");return never;},
    RemoveFromDownloadList:()=>{calls.push("remove");return never;}
  };
  const installs={
    OpenUninstallWizard:()=>{calls.push("uninstall");return never;}
  };
  const started=Date.now();
  const result=await nativeDownloadAction("cancel",730,false,
    "initial",downloads,installs,35);
  assert.deepEqual(result,{ok:true,uninstallRequested:true});
  assert.deepEqual(calls,["pause","remove","uninstall"]);
  assert.ok(Date.now()-started<900,"Steam RPCs must have a bounded acknowledgement wait");
});

test("a rejected async remove command cannot trigger uninstallation",async()=>{
  let uninstalls=0;
  const downloads={
    PauseAppUpdate:()=>Promise.resolve(),
    RemoveFromDownloadList:()=>Promise.reject(new Error("Steam remove rejected"))
  };
  const installs={OpenUninstallWizard:()=>{uninstalls++;}};
  const result=await nativeDownloadAction("cancel",730,false,"initial",downloads,installs,35);
  assert.deepEqual(result,{ok:false,uninstallRequested:false,reason:"failed"});
  assert.equal(uninstalls,0);
});

test("the UI does not await the slow Proton cleanup inside the busy state",()=>{
  const src=read("src/SteamGameDetails.tsx");
  const cancelStart=src.indexOf("  const cancelDownload=async(");
  const cancelEnd=src.indexOf("  const confirmCancelDownload=()=>",cancelStart);
  const body=src.slice(cancelStart,cancelEnd);
  assert.ok(cancelStart>=0&&cancelEnd>cancelStart);
  assert.match(src,/const inspectPrefixCleanup=\(appid:number\)=>\{/);
  assert.match(src,/withRequestTimeout\(cleanupCancelledSteamGame\(appid\),38000\)/);
  assert.match(body,/if\(result\.uninstallRequested\)inspectPrefixCleanup\(game\.id\)/);
  assert.doesNotMatch(body,/await cleanupCancelledSteamGame/);
  assert.match(body,/finally\{\s*busyRef\.current=false;\s*setDownloadBusy\(false\)/);
  assert.match(src,/downloadBusy\?"Sending\.\.\."\:cancelRequested\?"Cancel requested"/);
});

test("invalid IDs, shortcuts or unavailable APIs never start deletion",async()=>{
  let calls=0;
  const downloads={
    PauseAppUpdate:()=>calls++,
    RemoveFromDownloadList:()=>calls++
  };
  const installs={OpenUninstallWizard:()=>calls++};
  for(const id of [-1,0,1.1,NaN,0x80000000]){
    assert.deepEqual(await nativeDownloadAction("cancel",id,false,"initial",downloads,installs),
      {ok:false,uninstallRequested:false,reason:"invalid-app"});
  }
  assert.deepEqual(await nativeDownloadAction("cancel",730,true,"initial",downloads,installs),
    {ok:false,uninstallRequested:false,reason:"invalid-app"});
  assert.deepEqual(await nativeDownloadAction("cancel",730,false,"initial",downloads,{}),
    {ok:false,uninstallRequested:false,reason:"unavailable"});
  assert.equal(calls,0);
});

test("a Steam command failure does not claim the download was cancelled",async()=>{
  const downloads={PauseAppUpdate(){throw Error("Steam rejected cancel");},
    RemoveFromDownloadList(){throw Error("should not run");}};
  const result=await nativeDownloadAction("cancel",730,false,"initial",downloads,
    {OpenUninstallWizard(){}});
  assert.deepEqual(result,{ok:false,uninstallRequested:false,reason:"failed"});
});

test("Game Details requires explicit confirmation and uses protected backend cleanup",()=>{
  const src=read("src/SteamGameDetails.tsx");
  const backend=read("main.py");
  const packageScript=read("scripts/package.sh");
  assert.match(src,/showModal\(<ConfirmModal/);
  assert.match(src,/bDestructiveWarning/);
  assert.match(src,/downloadBusy/);
  assert.match(src,/currentDownloadRef\.current/);
  assert.match(src,/current\.downloadNature!==expectedNature/);
  assert.match(src,/gl-details-download-controls/);
  assert.match(src,/onAction\("download-toggle"\)/);
  assert.match(src,/onAction\("download-cancel"\)/);
  assert.match(src,/cleanupCancelledSteamGame\(game\.id\)/);
  assert.match(backend,/async def cleanup_cancelled_steam_game\(self, appid: int\):/);
  assert.match(packageScript,/steam_cancel_cleanup\.py/);
});
