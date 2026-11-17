import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {collectLibraryDiagnostics,formatLibraryDiagnostics}
  from "../src/libraryDiagnostics.ts";

test("diagnostics identify the gap between native game IDs and displayed titles",()=>{
  const cs={GetCollection:(id)=>{
    if(id==="type-games")return {
      allApps:[{appid:11,display_name:"Steam game"}],
      visibleApps:[{appid:11,display_name:"Steam game"},{appid:12}],
      apps:new Set([11,12,13])
    };
    if(id==="favorite")return {allApps:[],visibleApps:[{appid:12}]};
    if(id==="local-install")return {allApps:[{appid:11}]};
    return null;
  }};
  const app={
    GetAllApps:()=>[{appid:14},{appid:15}],
    GetAppOverviewByAppID:(id)=>id===14?{display_name:"Steam cache title"}:null,
    m_mapApps:new Map([[16,{appid:16}]])
  };
  const rendered=[
    {installed:true,favorite:false,nonSteam:false},
    {installed:false,favorite:false,nonSteam:false},
  ];
  const d=collectLibraryDiagnostics(cs,app,rendered);
  assert.equal(d.collectionsAvailable,true);
  assert.equal(d.appStoreAvailable,true);
  assert.equal(d.candidateRows,6);
  assert.equal(d.displayedGames,2);
  assert.equal(d.installed,1);
  assert.equal(d.favorites,0);
  assert.equal(d.collectionSources.find(x=>x.name==="type-games")?.merged,3);
  assert.equal(d.collectionSources.find(x=>x.name==="favorite")?.visibleApps,1);
  assert.equal(d.appSources.find(x=>x.name==="GetAllApps")?.rows,2);
  assert.equal(d.sampledUnresolved,4);
  assert.match(d.issue,/Many candidate IDs/);
});

test("diagnostics detect missing native Steam stores, not falsely report an empty library",()=>{
  const d=collectLibraryDiagnostics(undefined,undefined,[]);
  assert.equal(d.candidateRows,0);
  assert.equal(d.displayedGames,0);
  assert.equal(d.getCollectionAvailable,false);
  assert.equal(d.getOverviewAvailable,false);
  assert.match(d.issue,/Neither Steam/);
  const report=formatLibraryDiagnostics(d);
  assert.match(report,/collectionStore|Steam collections/);
  assert.match(report,/Candidate game IDs: 0/);
});

test("aggregate diagnostic report never exports game titles, IDs or private profile details",()=>{
  const title="Secret Local User Game Title";
  const id=76561198012345678;
  const d=collectLibraryDiagnostics(
    {GetCollection:(key)=>key==="type-games"?{
      allApps:[{appid:81,display_name:title,private_key:String(id)}],
    }:null},
    {GetAppOverviewByAppID:()=>({display_name:title,auth_token:"private-token"})},
    [{installed:true,favorite:true,nonSteam:false}],
  );
  const report=formatLibraryDiagnostics(d);
  assert.ok(report.includes("Installed: 1"));
  assert.ok(report.includes("Favorites: 1"));
  assert.ok(!report.includes(title));
  assert.ok(!report.includes(String(id)));
  assert.ok(!report.includes("private-token"));
  assert.ok(!report.includes("appid: 81"));
});

test("diagnostics screen runs inside Steam dashboard route and is reachable from QAM",()=>{
  const index=readFileSync(new URL("../src/index.tsx",import.meta.url),"utf8");
  const panel=readFileSync(new URL("../src/LibraryDiagnostics.tsx",import.meta.url),"utf8");
  assert.match(index,/const LIBRARY_DIAGNOSTICS_ROUTE/);
  assert.match(index,/routerHook\.addRoute\(LIBRARY_DIAGNOSTICS_ROUTE, LibraryDiagnostics/);
  assert.match(index,/routerHook\.removeRoute\(LIBRARY_DIAGNOSTICS_ROUTE\)/);
  assert.match(index,/Inspect Library Sources/);
  assert.match(panel,/collectLibraryDiagnostics\(/);
  assert.match(panel,/getLibraryGames\(\)/);
  assert.match(panel,/formatLibraryDiagnostics\(/);
  assert.match(panel,/navigator\.clipboard\?\.writeText/);
  assert.match(panel,/preferredFocus noFocusRing/);
  assert.doesNotMatch(panel,/fetch\(|postMessage|localStorage|sendBeacon/);
});
