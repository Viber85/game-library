import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  readNativeGameStatus,readSteamDownloadItems,readSteamDownloadOverview,
  resolveGameTransfer,resolveInstallMode,transferLabel
} from "../src/steamDownloadProgressCore.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("new SteamOS download-list format selects only the local AppID",()=>{
  const list=[
    {remote_client_id:"12345",item_data:[{
      appid:730,active:true,completed:false,
      update_type_info:[{has_update:true,overall_percent_complete:92}]
    }]},
    {remote_client_id:"0",item_data:[{
      appid:730,active:true,paused:false,completed:false,queue_index:0,
      update_type_info:[{has_update:true,completed_update:false,overall_percent_complete:37.5}]
    },{
      appid:570,active:true,completed:false,queue_index:0,
      update_type_info:[{has_update:true,overall_percent_complete:80}]
    }]}
  ];
  assert.deepEqual(readSteamDownloadItems(list,730),{phase:"downloading",percent:38});
  assert.equal(readSteamDownloadItems(list,1245620),null);
});

test("legacy flat queue can report queued, paused and real byte fallback",()=>{
  const queued={appid:730,active:false,paused:false,queue_index:1,
    completed:false,downloaded_bytes:250,total_bytes:1000};
  assert.deepEqual(readSteamDownloadItems([queued],730),{phase:"queued",percent:25});
  assert.deepEqual(readSteamDownloadItems([{...queued,paused:true}],730),
    {phase:"paused",percent:25});
  assert.equal(readSteamDownloadItems([{...queued,completed:true}],730),null);
  assert.equal(readSteamDownloadItems([{...queued,queue_index:-1}],730),null);
});

test("live Steam download overview refreshes only the running game's percent",()=>{
  const overview={update_appid:730,update_state:"Downloading",
    overall_percent_complete:62.8,remote_client_id:"0",paused:false};
  assert.deepEqual(readSteamDownloadOverview(overview,730),{
    phase:"downloading",percent:63
  });
  assert.equal(readSteamDownloadOverview(overview,570),null);
  assert.equal(readSteamDownloadOverview({...overview,remote_client_id:"100"},730),null);
  assert.deepEqual(readSteamDownloadOverview({...overview,paused:true},730),
    {phase:"paused",percent:63});
});

test("native local status overrides remote and the premature installed flag",()=>{
  const status=readNativeGameStatus({
    local_per_client_data:{clientid:"0",installed:true,display_status:7},
    most_available_per_client_data:{installed:true,display_status:11}
  });
  assert.deepEqual(status,{installed:true,displayStatus:7});
  const live=resolveGameTransfer(730,[],null,status.displayStatus);
  assert.deepEqual(live,{phase:"downloading",percent:null});
  assert.equal(resolveInstallMode(true,status.displayStatus,live,false),"transfer");
  assert.equal(transferLabel(live),"Downloading");
});

test("after native install wizard, Play is blocked until ready, including queue and pause",()=>{
  assert.equal(resolveInstallMode(true,null,null,true),"preparing");
  const queued=resolveGameTransfer(730,[],null,19);
  const paused=resolveGameTransfer(730,[],null,22);
  assert.equal(resolveInstallMode(true,19,queued,false),"transfer");
  assert.equal(resolveInstallMode(true,22,paused,false),"transfer");
  assert.equal(resolveInstallMode(false,9,null,false),"install");
  assert.equal(resolveInstallMode(true,24,null,false),"install");
  assert.equal(resolveInstallMode(true,11,null,false),"play");
  assert.equal(resolveInstallMode(true,null,null,false),"play");
  assert.equal(resolveInstallMode(false,null,null,false),"install");
});

test("native status cannot mask an active Steam download",()=>{
  const list=[{appid:730,active:true,paused:false,completed:false,queue_index:0,
    update_type_info:[{has_update:true,overall_percent_complete:32}]}];
  const transfer=resolveGameTransfer(730,list,{update_appid:730,
    update_state:"Downloading",overall_percent_complete:44},11);
  assert.deepEqual(transfer,{phase:"downloading",percent:44});
  assert.equal(resolveInstallMode(true,11,transfer,false),"transfer");
});

test("SteamOS progress arrays use actual bytes when overall_percent_complete is missing",()=>{
  const overview={update_appid:730,update_state:"Downloading",
    progress:[{bytes_in_progress:250,bytes_total:1000},{bytes_in_progress:50,bytes_total:500}]};
  assert.deepEqual(readSteamDownloadOverview(overview,730),
    {phase:"downloading",percent:20});
  const list=[{appid:730,active:true,paused:false,completed:false,queue_index:0,
    update_type_info:[{has_update:true,completed_update:false,
      progress:[{bytes_in_progress:100,bytes_total:1000}]}]}];
  assert.deepEqual(readSteamDownloadItems(list,730),{phase:"downloading",percent:10});
  const bytes=[{appid:730,active:true,paused:false,completed:false,queue_index:0,
    downloaded_bytes:512,total_bytes:1024}];
  assert.deepEqual(readSteamDownloadItems(bytes,730),{phase:"downloading",percent:50});
});

test("completed item returns to Play only after all native transfer sources finish",()=>{
  const list=[{appid:730,active:false,paused:false,completed:true,queue_index:-1,
    update_type_info:[{has_update:true,overall_percent_complete:100}]}];
  const transfer=resolveGameTransfer(730,list,{update_appid:730,
    update_state:"None",overall_percent_complete:100},11);
  assert.equal(transfer,null);
  assert.equal(resolveInstallMode(true,11,transfer,false),"play");
  assert.equal(resolveInstallMode(true,11,null,true),"preparing");
});

test("Game Details shows live Steam progress and never routes an active download to native details",()=>{
  const details=read("src/SteamGameDetails.tsx");
  const hook=read("src/useSteamGameDownload.ts");
  const theme=read("src/theme.ts");
  assert.match(details,/useSteamGameDownload\(game\.id,game\.nonSteam\)/);
  assert.match(details,/resolveInstallMode\(/);
  assert.match(details,/installMode==="transfer"/);
  assert.match(details,/gl-details-download-track/);
  assert.match(details,/role="progressbar"/);
  assert.match(details,/aria-valuenow=\{nativeDownload\.transfer\.percent\?\?undefined\}/);
  assert.match(details,/if\(installMode==="transfer"\)\{/);
  assert.match(details,/if\(installMode==="play"\)\{\s*play\(\{\.\.\.game,installed:true\}\)/);
  assert.match(hook,/RegisterForDownloadItems/);
  assert.match(hook,/RegisterForDownloadOverview/);
  assert.match(hook,/subscription\.unregister\?\.\(\)/);
  assert.match(theme,/\.gl-root \.gl-details-download-fill/);
});

test("download state remains sourced from Steam without a redundant Game Info diagnostics panel",()=>{
  const details=read("src/SteamGameDetails.tsx");
  const hook=read("src/useSteamGameDownload.ts");
  assert.doesNotMatch(details,/gl-details-download-diagnostics/);
  assert.match(hook,/findModuleChild\(/);
  assert.match(hook,/GetDownloadItemForAppId/);
  assert.match(details,/if\(nativeDownload\.transfer\|\|nativeDownload\.displayStatus===9\)/);
});
