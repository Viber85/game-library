import test from "node:test";
import assert from "node:assert/strict";
import {
  nativeRows,nativeAppId,nativeCollectionRows,nativeLibraryRows,nativeBooleanFlag,
  defaultLibraryTabGames
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

test("a numeric collection ID must not hide a later rich app overview",()=>{
  const rows=nativeCollectionRows({
    allApps:[91],
    visibleApps:[{appid:91,display_name:"Known game",installed:false}]
  });
  assert.equal(rows.length,1);
  assert.equal(rows[0].display_name,"Known game");
  assert.equal(rows[0].installed,false);
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

test("fallback tabs select distinct inventories, not the same first games",()=>{
  const games=[
    {id:1,installed:true,favorite:true,nonSteam:false},
    {id:2,installed:true,favorite:false,nonSteam:false},
    {id:3,installed:false,favorite:true,nonSteam:false},
    {id:4,installed:true,favorite:false,nonSteam:true},
    {id:5,installed:false,favorite:false,nonSteam:false},
  ];
  const idsFor=id=>defaultLibraryTabGames(id,games).map(g=>g.id);
  assert.deepEqual(idsFor("AllGames"),[1,2,3,5],
    "Steam All Games must include uninstalled Steam titles, not Non-Steam shortcuts");
  assert.deepEqual(idsFor("Installed"),[1,2],
    "Steam Installed must not include Non-Steam shortcuts merely marked installed");
  assert.deepEqual(idsFor("Favorites"),[1,3],
    "Favorites must include favorited games even if not installed");
  assert.deepEqual(idsFor("NonSteam"),[4]);
  assert.equal(defaultLibraryTabGames("Epic",games),null);
});

test("real Claw native fallback counts keep 464 Steam, 10 installed, 321 Non-Steam separate",()=>{
  const games=[
    ...Array.from({length:464},(_,i)=>({
      id:i+1,installed:i<10,favorite:false,nonSteam:false
    })),
    ...Array.from({length:321},(_,i)=>({
      id:10000+i,installed:true,favorite:false,nonSteam:true
    })),
  ];
  const native={
    allGames:new Set(Array.from({length:464},(_,i)=>i+1)),
    installed:new Set(Array.from({length:10},(_,i)=>i+1)),
    favorites:new Set(),
  };
  const all=defaultLibraryTabGames("AllGames",games,native);
  const installed=defaultLibraryTabGames("Installed",games,native);
  const favorites=defaultLibraryTabGames("Favorites",games,native);
  const nonSteam=defaultLibraryTabGames("NonSteam",games,native);
  assert.equal(all.length,464);
  assert.equal(installed.length,10);
  assert.equal(favorites.length,0);
  assert.equal(nonSteam.length,321);
  assert.ok(installed.every(g=>!g.nonSteam));
  assert.ok(nonSteam.every(g=>g.nonSteam));
  assert.equal(games.filter(g=>g.installed).length,331,
    "A raw installed flag total of 331 must NOT become Steam Installed tab");
});

test("native favorite membership is authoritative when the collection is empty",()=>{
  const games=[
    {id:1,installed:true,favorite:true,nonSteam:false},
    {id:2,installed:true,favorite:false,nonSteam:false},
  ];
  assert.deepEqual(defaultLibraryTabGames("Favorites",games,{favorites:new Set()}),[],
    "Do not invent favorites when Steam native favorite collection is empty");
  assert.deepEqual(defaultLibraryTabGames("Favorites",games,{favorites:null}),[games[0]],
    "When Steam collection is inaccessible, fall back to game overview favorites");
  assert.deepEqual(defaultLibraryTabGames("Installed",games,{installed:new Set([2])}),[games[1]]);
});
