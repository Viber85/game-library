import {
  NATIVE_LIBRARY_COLLECTIONS, nativeAppId, nativeCollectionRows,
  nativeLibraryRows, nativeRows,
} from "./libraryInventory.ts";

/**
 * On-device, read-only diagnostics for the ACTUAL Game Library document.
 * Only aggregate counts and capability flags leave this module. Never copy
 * game titles, app IDs, Steam IDs, paths, tokens or collection names.
 */
type RecordLike=Record<string,any>;
type GameFlags={installed:boolean;favorite:boolean;nonSteam:boolean};
export type SourceCount={
  name:string;available:boolean;allApps:number;visibleApps:number;
  apps:number;merged:number;
};
export type LibraryDiagnostic={
  collectionsAvailable:boolean;appStoreAvailable:boolean;
  getCollectionAvailable:boolean;getOverviewAvailable:boolean;
  collectionSources:SourceCount[];
  appSources:Array<{name:string;available:boolean;rows:number}>;
  candidateRows:number;displayedGames:number;
  installed:number;favorites:number;nonSteam:number;
  sampled:number;sampledRowTitles:number;sampledOverviewTitles:number;
  sampledUnresolved:number;
  issue:string;
};
const obj=(v:unknown):RecordLike|null=>
  v!==null && typeof v==="object" ? v as RecordLike : null;
const access=(v:unknown,key:string):unknown=>{
  try{return obj(v)?.[key];}catch{return undefined;}
};
const count=(v:unknown):number=>{
  try{return nativeRows(v).length;}catch{return 0;}
};
const titled=(v:unknown):boolean=>{
  const item=obj(v);
  return typeof item?.display_name==="string"&&item.display_name.trim().length>0||
    typeof item?.name==="string"&&item.name.trim().length>0;
};
function sourceCount(cs:RecordLike|null,id:string):SourceCount{
  let collection:unknown;
  try{collection=cs?.GetCollection?.(id);}catch{/* Steam may still be hydrating */}
  return {
    name:id,available:Boolean(obj(collection)),
    allApps:count(access(collection,"allApps")),
    visibleApps:count(access(collection,"visibleApps")),
    apps:count(access(collection,"apps")),
    merged:nativeCollectionRows(collection).length,
  };
}

export function collectLibraryDiagnostics(
  collectionStore:unknown,appStore:unknown,games:readonly GameFlags[],
):LibraryDiagnostic{
  const cs=obj(collectionStore),app=obj(appStore);
  const collectionSources=NATIVE_LIBRARY_COLLECTIONS.map(id=>sourceCount(cs,id));
  const appKeys=["GetAllApps","m_rgApps","m_rgAllApps","m_mapApps","m_mapAppOverview"];
  const appSources=appKeys.map(name=>{
    let rows:unknown;
    if(name==="GetAllApps") {
      try{rows=typeof app?.GetAllApps==="function"?app.GetAllApps():undefined;}
      catch{/* no inventory API available */}
    }else rows=access(app,name);
    return {name,available:rows!==undefined&&rows!==null,rows:count(rows)};
  });
  const candidates=nativeLibraryRows(cs,app);
  const sampled=Math.min(120,candidates.length);
  let sampledRowTitles=0,sampledOverviewTitles=0,sampledUnresolved=0;
  for(const row of candidates.slice(0,sampled)){
    const rowHasTitle=titled(row);
    if(rowHasTitle)sampledRowTitles++;
    let overview:unknown;
    const id=nativeAppId(row);
    if(id!==null){
      try{overview=app?.GetAppOverviewByAppID?.(id);}
      catch{/* Some Steam IDs may not have hydrated overviews. */}
    }
    if(titled(overview))sampledOverviewTitles++;
    if(!rowHasTitle&&!titled(overview))sampledUnresolved++;
  }
  const installed=games.filter(g=>g.installed).length;
  const favorites=games.filter(g=>g.favorite).length;
  const nonSteam=games.filter(g=>g.nonSteam).length;
  let issue="Inspect source counts alongside the native Steam Library.";
  if(!cs&&!app)issue="Neither Steam collectionStore nor appStore is visible in this page.";
  else if(sampled>0 && candidates.length>games.length*1.5 &&
          sampledUnresolved>sampled/3)
    issue="Many candidate IDs have no loaded title or app overview in this page.";
  else if(candidates.length<=15 && games.length<=15)
    issue="Only a few candidate IDs reached this page; the library source may be incomplete.";
  else if(collectionSources.find(x=>x.name==="favorite")?.merged &&
          favorites===0)
    issue="Steam reports favorite collection entries, but none appear in Favorites.";
  else if(games.length>0 && installed===games.length)
    issue="All visible games are marked installed; compare with Steam's installed count.";
  return {
    collectionsAvailable:!!cs,appStoreAvailable:!!app,
    getCollectionAvailable:typeof cs?.GetCollection==="function",
    getOverviewAvailable:typeof app?.GetAppOverviewByAppID==="function",
    collectionSources,appSources,
    candidateRows:candidates.length,displayedGames:games.length,
    installed,favorites,nonSteam,
    sampled,sampledRowTitles,sampledOverviewTitles,sampledUnresolved,issue,
  };
}

export function formatLibraryDiagnostics(r:LibraryDiagnostic):string{
  const yes=(v:boolean)=>v?"yes":"no";
  const lines=[
    "GAME LIBRARY — NATIVE LIBRARY DIAGNOSTICS",
    "Aggregate counts only; no game names, app IDs or personal data.",
    "",
    "Steam collections present: "+yes(r.collectionsAvailable)+
      " | GetCollection: "+yes(r.getCollectionAvailable),
    "Steam appStore present: "+yes(r.appStoreAvailable)+
      " | GetAppOverview: "+yes(r.getOverviewAvailable),
    "Candidate game IDs: "+r.candidateRows,
    "Displayed games: "+r.displayedGames+
      " | Installed: "+r.installed+" | Favorites: "+r.favorites+
      " | Non-Steam: "+r.nonSteam,
    "Title sample: "+r.sampled+" candidates; "+r.sampledRowTitles+
      " row titles; "+r.sampledOverviewTitles+" overview titles; "+
      r.sampledUnresolved+" unresolved",
    "",
    "NATIVE COLLECTIONS (allApps / visibleApps / apps / unique)",
    ...r.collectionSources.map(s=>s.name+": "+
      (s.available?"present":"missing")+" — "+
      [s.allApps,s.visibleApps,s.apps,s.merged].join(" / ")),
    "",
    "APPSTORE SOURCES",
    ...r.appSources.map(s=>s.name+": "+(s.available?String(s.rows):"unavailable")),
    "",
    "OBSERVATION: "+r.issue,
  ];
  return lines.join("\n");
}
