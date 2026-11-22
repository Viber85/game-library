import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {
  readSteamDownloadMetrics,EMPTY_DOWNLOAD_METRICS,
  formatDownloadBytes,formatDownloadTime
} from "../src/steamDownloadMetrics.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const GiB=1024**3;

test("the active app uses real Steam overview bytes and its remaining seconds",()=>{
  const data=readSteamDownloadMetrics(730,[
    {appid:730,active:true,completed:false,queue_index:0,
      downloaded_bytes:1*GiB,total_bytes:8*GiB}
  ],{
    update_appid:730,update_state:"Downloading",update_bytes_downloaded:2*GiB,
    update_bytes_to_download:8*GiB,update_seconds_remaining:240
  });
  assert.deepEqual(data,{
    downloadedBytes:2*GiB,totalBytes:8*GiB,remainingSeconds:240
  });
});

test("ETA uses Steam Downloads' overall remaining time before network-only estimate",()=>{
  const overview={update_appid:730,update_state:"Downloading",
    overall_estimated_time_remaining_sec:455,
    update_seconds_remaining:210,
    update_bytes_downloaded:2*GiB,update_bytes_to_download:4*GiB};
  assert.deepEqual(readSteamDownloadMetrics(730,[],overview),{
    downloadedBytes:2*GiB,totalBytes:4*GiB,remainingSeconds:455
  });
  assert.equal(formatDownloadTime(455),"8 min");
  assert.equal(readSteamDownloadMetrics(570,[],overview).remainingSeconds,null);
  assert.equal(readSteamDownloadMetrics(730,[],{...overview,paused:true}).remainingSeconds,null);
});

test("Steam falls back to network-only remaining seconds if overall ETA is missing",()=>{
  const overview={update_appid:730,update_state:"Downloading",
    update_seconds_remaining:140};
  assert.equal(readSteamDownloadMetrics(730,[],overview).remainingSeconds,140);
  assert.equal(readSteamDownloadMetrics(730,[],{
    ...overview,overall_estimated_time_remaining_sec:-1
  }).remainingSeconds,140);
  assert.equal(readSteamDownloadMetrics(730,[],{
    ...overview,remote_client_id:"remote"
  }).remainingSeconds,null);
});

test("the queue counts the current game's local bytes and rejects other PCs",()=>{
  const items=[
    {remote_client_id:"725",item_data:[{
      appid:730,active:true,completed:false,queue_index:0,
      downloaded_bytes:7*GiB,total_bytes:8*GiB
    }]},
    {remote_client_id:"0",item_data:[{
      appid:570,active:true,completed:false,queue_index:0,
      downloaded_bytes:1*GiB,total_bytes:2*GiB
    },{
      appid:730,active:false,paused:false,completed:false,queue_index:1,
      downloaded_bytes:3*GiB,total_bytes:8*GiB
    }]}
  ];
  assert.deepEqual(readSteamDownloadMetrics(730,items,null),{
    downloadedBytes:3*GiB,totalBytes:8*GiB,remainingSeconds:null
  });
  assert.deepEqual(readSteamDownloadMetrics(730,items,{
    remote_client_id:"725",update_appid:730,update_state:"Downloading",
    update_bytes_downloaded:6*GiB,update_bytes_to_download:8*GiB,
    update_seconds_remaining:9
  }),{downloadedBytes:3*GiB,totalBytes:8*GiB,remainingSeconds:null});
});

test("paused and finished downloads do not inherit an ETA or false totals",()=>{
  const paused=readSteamDownloadMetrics(730,[],{
    update_appid:730,update_state:"Downloading",paused:true,
    update_bytes_downloaded:"1024",update_bytes_to_download:"2048",
    update_seconds_remaining:600
  });
  assert.deepEqual(paused,{
    downloadedBytes:1024,totalBytes:2048,remainingSeconds:null
  });
  assert.deepEqual(readSteamDownloadMetrics(730,[],{
    update_appid:730,update_state:"None",update_bytes_downloaded:1024,
    update_bytes_to_download:2048,update_seconds_remaining:300
  }),EMPTY_DOWNLOAD_METRICS);
  assert.deepEqual(readSteamDownloadMetrics(730,[
    {appid:730,active:false,completed:true,queue_index:-1,
      downloaded_bytes:1*GiB,total_bytes:2*GiB}
  ],null),EMPTY_DOWNLOAD_METRICS);
});

test("missing ETA or total size is unknown, not guessed from percentage",()=>{
  assert.deepEqual(readSteamDownloadMetrics(730,[],{
    update_appid:730,update_state:"Downloading",
    overall_percent_complete:35,update_seconds_remaining:-1
  }),EMPTY_DOWNLOAD_METRICS);
  assert.deepEqual(readSteamDownloadMetrics(730,[],{
    update_appid:730,update_state:"Downloading",update_seconds_remaining:0,
    update_bytes_downloaded:512,update_bytes_to_download:0
  }),EMPTY_DOWNLOAD_METRICS);
  assert.deepEqual(readSteamDownloadMetrics(730,[],{
    update_appid:730,update_state:"Downloading",update_seconds_remaining:90
  }),{downloadedBytes:null,totalBytes:null,remainingSeconds:90});
});

test("local app overview is a fallback only during a matched active transfer",()=>{
  const overview={appid:730,local_per_client_data:{
    bytes_downloaded:"1073741824",bytes_total:String(5*GiB)
  }};
  const queue=[{appid:730,active:true,completed:false,queue_index:0}];
  assert.deepEqual(readSteamDownloadMetrics(730,queue,null,overview),{
    downloadedBytes:GiB,totalBytes:5*GiB,remainingSeconds:null
  });
  assert.deepEqual(readSteamDownloadMetrics(730,[],null,overview),EMPTY_DOWNLOAD_METRICS);
});

test("size/time formatting is compact and never claims an estimated ETA",()=>{
  assert.equal(formatDownloadBytes(2*GiB),"2.0 GB");
  assert.equal(formatDownloadBytes(256*1024**2),"256.0 MB");
  assert.equal(formatDownloadBytes(null),"—");
  assert.equal(formatDownloadTime(75),"2 min");
  assert.equal(formatDownloadTime(3600),"1 h");
  assert.equal(formatDownloadTime(3750),"1 h 3 min");
  assert.equal(formatDownloadTime(null),"Estimating");
});

test("Game Details shows byte progress and native ETA only for selected transfer",()=>{
  const details=read("src/SteamGameDetails.tsx");
  const hook=read("src/useSteamGameDownload.ts");
  const css=read("src/theme.ts");
  assert.match(details,/gl-details-download-metrics/);
  assert.match(details,/<b>Downloaded<\/b>/);
  assert.match(details,/<b>Remaining<\/b>/);
  assert.match(details,/<b>Time left<\/b>/);
  assert.match(details,/formatDownloadBytes\(Math\.max\(0,/);
  assert.match(details,/formatDownloadTime\(nativeDownload\.metrics\.remainingSeconds\)/);
  assert.match(hook,/readSteamDownloadMetrics\(appId,chosenItems,chosenOverview,app\)/);
  assert.match(hook,/a\.metrics\.remainingSeconds===b\.metrics\.remainingSeconds/);
  assert.match(css,/\.gl-root \.gl-details-download-metrics/);
});
