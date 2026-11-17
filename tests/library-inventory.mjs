import test from "node:test";
import assert from "node:assert/strict";
import {
  nativeRows,nativeAppId,nativeCollectionRows,nativeLibraryRows,nativeBooleanFlag
} from "../src/libraryInventory.ts";

const ids=rows=>rows.map(nativeAppId);

test("Steam collections merge allApps, visibleApps and apps rather than first non-null",()=>{
  const collection={
    allApps:[{appid:10,title:"Steam game A"}],
    visibleApps:[{appid:10,title:"Steam game A"},{appid:11,title:"Steam game B"}],
    apps:new Set([10,11,12])
  };
  assert.deepEqual(ids(nativeCollectionRows(collection)),[10,11,12]);
  assert.deepEqual(ids(nativeCollectionRows({allApps:[],visibleApps:[{appid:66}]})),[66],
    "An empty allApps MUST NOT hide Steam's hydrated visibleApps");
  assert.deepEqual(ids(nativeCollectionRows({allApps:[],visibleApps:[],apps:new Set([90])})),[90],
    "A native Steam Set of IDs is an actual collection, not an empty tab");
});

test("all games includes non-installed appStore entries even when Steam collections are partial",()=>{
  const collections={
    "type-games":{allApps:[{appid:10,installed:true}],visibleApps:[{appid:11,installed:true}]},
    "local-install":{allApps:[{appid:10,installed:true}]},
    favorite:{allApps:[],visibleApps:[{appid:11}]},
    "type-nonsteam":{allApps:[],visibleApps:[]}
  };
  const cs={GetCollection:id=>collections[id],userCollections:[]};
  const store={
    GetAllApps:()=>[{appid:10,installed:true},{appid:12,installed:false}],
    m_rgApps:new Map([[13,{display_name:"Uninstalled Game"}]]),
    m_mapApps:new Map([[14,{appid:14,display_name:"Another Game"}]]),
  };
  assert.deepEqual(ids(nativeLibraryRows(cs,store)),[10,11,12,13,14]);
  assert.deepEqual(ids(nativeCollectionRows(cs.GetCollection("favorite"))),[11]);
  assert.deepEqual(ids(nativeCollectionRows(cs.GetCollection("local-install"))),[10]);
});

test("Unifideck custom collections remain available but do not restrict all games",()=>{
  const cs={
    GetCollection:()=>null,
    userCollections:[
      {displayName:"[Unifideck] Epic",allApps:[{appid:45}]},
      {displayName:"[Unifideck] GOG",visibleApps:[{appid:46}]},
      {displayName:"My Collection",allApps:[{appid:47}]}
    ]
  };
  assert.deepEqual(ids(nativeLibraryRows(cs,{GetAllApps:()=>[{appid:48}]})),[45,46,48]);
});

test("observable Map, object and signed non-Steam IDs are normalized without losing identity",()=>{
  assert.deepEqual(ids(nativeRows(new Map([[99,{display_name:"Game"}],[-1234,{display_name:"Shortcut"}]]))),
    [99,4294966062]);
  assert.deepEqual(ids(nativeRows({"150":{display_name:"Steam"},"151":true})),[150,151]);
  assert.equal(nativeAppId({appid:4294967295}),4294967295);
  assert.equal(nativeAppId({appid:"not-an-id"}),null);
  assert.equal(nativeAppId(Promise.resolve({appid:77})),null);
});

test("Installed and Favorite flags never treat a function object as true",()=>{
  assert.equal(nativeBooleanFlag({BIsInstalled:()=>false},["BIsInstalled"]),false);
  assert.equal(nativeBooleanFlag({BIsInstalled:()=>true},["BIsInstalled"]),true);
  assert.equal(nativeBooleanFlag({installed:false,BIsInstalled:()=>true},
    ["installed","BIsInstalled"]),false);
  assert.equal(nativeBooleanFlag({installed:0},["installed"]),false);
  assert.equal(nativeBooleanFlag({favorite:undefined},["favorite"]),undefined);
  assert.equal(nativeBooleanFlag({BIsInstalled:()=>Promise.resolve(true)},
    ["BIsInstalled"]),undefined);
  assert.equal(nativeBooleanFlag({BIsFavorite:()=>true},["BIsFavorite"]),true);
});

test("Empty/missing native stores cannot produce phantom games",()=>{
  assert.deepEqual(nativeLibraryRows(undefined,undefined),[]);
  assert.deepEqual(nativeLibraryRows({GetCollection:()=>{throw Error("not ready");}},{}),[]);
  assert.deepEqual(nativeCollectionRows(null),[]);
  assert.deepEqual(nativeRows(null),[]);
});
