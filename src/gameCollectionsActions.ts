import {getAutoTabs,saveOwnTabs} from "./autoTabSource";
import {
  assignManualGames,assignSmartExceptions,gamesForLibraryTab,
  type LibraryTab
} from "./libraryTabs";
import {getLibraryGames} from "./steam";
import {loadManualCollections,changeManualCollection,
  type ManualSection} from "./manualCollections";
import {canonicalSteamAppId} from "./launchGame";

export type CollectionChoice={
  key:string;title:string;kind:"manual"|"tab"|"steam";
  selected:boolean;removable:boolean;
};
type SteamCollection={
  id?:string;displayName?:string;
  allApps?:unknown;visibleApps?:unknown;
  IsDynamic?:()=>boolean;
  AsDragDropCollection?:()=>{
    AddApps:(apps:{appid:number}[])=>void;
    RemoveApps?:(apps:{appid:number}[])=>void;
  };
  Save?:()=>Promise<unknown>;
};
type CollectionStore={userCollections?:SteamCollection[]};
const store=()=>((window as Window&{collectionStore?:CollectionStore}).collectionStore);
const steamId=(id:number):number=>{
  const canonical=canonicalSteamAppId(id);
  if(canonical===null)throw new Error("Steam game ID is unavailable");
  return canonical>=0x80000000?canonical|0:canonical;
};
const members=(c:SteamCollection):Set<number>=>{
  const result=new Set<number>();
  for(const key of ["allApps","visibleApps"] as const){
    const value=c[key];
    if(!value||typeof (value as Iterable<unknown>)[Symbol.iterator]!=="function")continue;
    for(const entry of value as Iterable<unknown>){
      const id=typeof entry==="number"?entry:
        typeof entry==="object"&&entry!==null&&
          "appid" in entry?(entry as {appid:unknown}).appid:null;
      if(typeof id==="number"&&Number.isInteger(id))result.add(id);
    }
    if(result.size)break;
  }
  return result;
};
const nativeCollections=()=>{
  const seen=new Set<string>();
  return (store()?.userCollections??[]).filter(c=>{
    const name=c.displayName?.trim();
    if(!name||seen.has(name)||c.IsDynamic?.()||typeof c.Save!=="function"||
       typeof c.AsDragDropCollection!=="function")return false;
    seen.add(name);
    return true;
  });
};
const customTabs=()=>getAutoTabs().tabs.filter(t=>t.kind==="custom"&&t.visible);

/** No synthetic GOG AppID: only the registered non-Steam shortcut qualifies. */
export async function listGameCollections(appId:number):Promise<CollectionChoice[]>{
  const id=steamId(appId);
  const own=await loadManualCollections().catch(()=>null);
  const result:CollectionChoice[]=[];
  for(const section of ["backlog","completed"] as ManualSection[]){
    result.push({key:"manual:"+section,title:section==="backlog"?"Backlog":"Completed",
      kind:"manual",selected:Boolean(own?.ok&&own.collections?.[section]?.includes(id>>>0)),
      removable:true});
  }
  const game=getLibraryGames().find(g=>(g.id>>>0)===(id>>>0));
  for(const tab of customTabs()){
    const currently=game?gamesForLibraryTab(tab,[game]).games.length>0:
      (tab.mode==="manual"?tab.members?.includes(id>>>0):
        tab.forceInclude?.includes(id>>>0))??false;
    result.push({key:"tab:"+tab.id,title:tab.title,kind:"tab",
      selected:currently,removable:true});
  }
  for(const c of nativeCollections()){
    result.push({key:"steam:"+c.displayName,title:c.displayName??"Steam collection",
      kind:"steam",selected:members(c).has(id),removable:true});
  }
  return result;
}

export async function changeGameCollection(
  appId:number,choice:CollectionChoice,include:boolean,
):Promise<void>{
  const id=steamId(appId);
  if(choice.kind==="manual"){
    const section=choice.key.split(":")[1];
    if(section!=="backlog"&&section!=="completed")
      throw new Error("Invalid Game Library collection");
    const result=await changeManualCollection(section,id>>>0,include);
    if(!result.ok)throw new Error(result.reason||"Saving Game Library collection failed");
    return;
  }
  if(choice.kind==="tab"){
    const tabId=choice.key.slice(4);
    const tabs=getAutoTabs().tabs;
    const tab=tabs.find(x=>x.id===tabId&&x.kind==="custom"&&x.visible);
    if(!tab)throw new Error("Custom collection is no longer available");
    let updated:LibraryTab[];
    if(tab.mode==="manual"){
      const set=new Set(tab.members??[]);
      if(include)set.add(id>>>0);else set.delete(id>>>0);
      updated=assignManualGames(tabs,tabId,[...set]);
    }else{
      const set=new Set(include?tab.forceInclude??[]:tab.forceExclude??[]);
      set.add(id>>>0);
      updated=assignSmartExceptions(tabs,tabId,
        include?"include":"exclude",[...set]);
    }
    await saveOwnTabs(updated);
    return;
  }
  const label=choice.key.slice(6);
  const collection=nativeCollections().find(c=>c.displayName===label);
  if(!collection)throw new Error("Steam collection no longer exists");
  const drag=collection.AsDragDropCollection?.();
  if(!drag)throw new Error("Steam collection cannot be modified");
  if(include)drag.AddApps([{appid:id}]);
  else if(typeof drag.RemoveApps==="function")drag.RemoveApps([{appid:id}]);
  else throw new Error("Steam cannot remove games from this collection here");
  await collection.Save?.();
}
