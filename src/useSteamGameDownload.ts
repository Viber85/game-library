import {useEffect,useState} from "react";
import {findModuleChild} from "@decky/ui";
import {
  readSteamDownloadMetrics,EMPTY_DOWNLOAD_METRICS,
  type SteamDownloadMetrics
} from "./steamDownloadMetrics";
import {
  readNativeGameStatus,readSteamDownloadItems,resolveGameTransfer,
  type GameTransfer,type NativeGameStatus
} from "./steamDownloadProgressCore";

type Register={unregister?:()=>void};
type NativeDownloads={
  RegisterForDownloadItems?:(cb:(first:unknown,second?:unknown)=>void)=>Register;
  RegisterForDownloadOverview?:(cb:(data:unknown)=>void)=>Register;
};
type SteamDownloadsStore={
  m_DownloadItems?:unknown;
  m_DownloadOverview?:unknown;
  AllTransfers?:unknown;
  DownloadOverview?:unknown;
  GetDownloadItemForAppId?:(id:number)=>unknown;
};
type Host={
  SteamClient?:{Downloads?:NativeDownloads};
  appStore?:{GetAppOverviewByAppID?:(id:number)=>unknown};
  downloadsStore?:SteamDownloadsStore;
};
export type GameDownloadSnapshot=NativeGameStatus&{
  appId:number;transfer:GameTransfer|null;metrics:SteamDownloadMetrics;
  debug:{items:boolean;overview:boolean;store:boolean;queue:boolean};
};
const EMPTY:GameDownloadSnapshot={
  appId:0,installed:null,displayStatus:null,transfer:null,
  metrics:EMPTY_DOWNLOAD_METRICS,
  debug:{items:false,overview:false,store:false,queue:false}
};
const same=(a:GameDownloadSnapshot,b:GameDownloadSnapshot)=>
  a.appId===b.appId&&a.installed===b.installed&&
  a.displayStatus===b.displayStatus&&a.transfer?.phase===b.transfer?.phase&&
  a.transfer?.percent===b.transfer?.percent&&
  a.metrics.downloadedBytes===b.metrics.downloadedBytes&&
  a.metrics.totalBytes===b.metrics.totalBytes&&
  a.metrics.remainingSeconds===b.metrics.remainingSeconds&&
  a.debug.items===b.debug.items&&a.debug.overview===b.debug.overview&&
  a.debug.store===b.debug.store&&a.debug.queue===b.debug.queue;

// Valve's DownloadsStore is also exposed to Steam's own interface. The
// original plugin only read window.downloadsStore, which is not guaranteed
// to be present in a Decky route. Resolve the verified store once.
let cachedStore:SteamDownloadsStore|null|undefined;
function nativeStore(host:Host):SteamDownloadsStore|null{
  if(host.downloadsStore)return host.downloadsStore;
  if(cachedStore!==undefined)return cachedStore;
  try{
    const result=findModuleChild((module:unknown)=>{
      if(!module||typeof module!=="object")return undefined;
      for(const candidate of Object.values(module)){
        if(candidate&&typeof candidate==="object"&&
          typeof (candidate as SteamDownloadsStore).GetDownloadItemForAppId==="function"&&
          ("m_DownloadItems" in candidate||"AllTransfers" in candidate))
          return candidate;
      }
      return undefined;
    }) as SteamDownloadsStore|null|undefined;
    cachedStore=result??null;
  }catch(error){
    console.warn("[game-library] native download store unavailable",error);
    cachedStore=null;
  }
  return cachedStore;
}
function getStoreItems(store:SteamDownloadsStore|null,appId:number):unknown{
  if(!store)return undefined;
  try{
    const values=store.AllTransfers??store.m_DownloadItems;
    if(Array.isArray(values))return values;
    const single=store.GetDownloadItemForAppId?.(appId);
    return single?[single]:undefined;
  }catch{return undefined;}
}
function getStoreOverview(store:SteamDownloadsStore|null):unknown{
  if(!store)return undefined;
  try{return store.DownloadOverview??store.m_DownloadOverview;}
  catch{return undefined;}
}

/** Real-time, read-only native queue on this specific game's Details page. */
export function useSteamGameDownload(appId:number,nonSteam:boolean):GameDownloadSnapshot{
  const [snapshot,setSnapshot]=useState<GameDownloadSnapshot>(EMPTY);
  useEffect(()=>{
    if(nonSteam||!Number.isSafeInteger(appId)||appId<=0||appId>=0x80000000){
      setSnapshot({...EMPTY,appId});
      return;
    }
    const host=window as unknown as Host;
    const api=host.SteamClient?.Downloads;
    const store=nativeStore(host);
    let alive=true,items:unknown,overview:unknown;
    let itemsSeen=false,overviewSeen=false;
    const read=()=>{
      if(!alive)return;
      let app:unknown;
      try{app=host.appStore?.GetAppOverviewByAppID?.(appId);}
      catch(error){console.warn("[game-library] app overview unavailable",error);}
      const status=readNativeGameStatus(app);
      const storeItems=getStoreItems(store,appId);
      const storeOverview=getStoreOverview(store);
      // Prefer Steam callbacks when delivered. A discovered native store
      // is a read-only snapshot fallback if callbacks are absent or have not
      // yet populated their lists.
      const callbackMatch=readSteamDownloadItems(items,appId);
      const storedMatch=readSteamDownloadItems(storeItems,appId);
      const chosenItems=callbackMatch?items:storedMatch?storeItems:
        itemsSeen?items:storeItems;
      const chosenOverview=overviewSeen?overview:storeOverview;
      const transfer=resolveGameTransfer(
        appId,chosenItems,chosenOverview,status.displayStatus
      );
      const metrics=transfer?
        readSteamDownloadMetrics(appId,chosenItems,chosenOverview,app):
        EMPTY_DOWNLOAD_METRICS;
      const next:GameDownloadSnapshot={
        appId,...status,transfer,metrics,
        debug:{items:itemsSeen,overview:overviewSeen,store:!!store,
          queue:!!callbackMatch||!!storedMatch}
      };
      setSnapshot(old=>same(old,next)?old:next);
    };
    const subscriptions:Register[]=[];
    try{
      const sub=api?.RegisterForDownloadItems?.((first,second)=>{
        const data=Array.isArray(second)?second:Array.isArray(first)?first:undefined;
        if(data!==undefined){items=data;itemsSeen=true;}
        read();
      });
      if(sub)subscriptions.push(sub);
    }catch(error){console.warn("[game-library] download-list subscription unavailable",error);}
    try{
      const sub=api?.RegisterForDownloadOverview?.(data=>{
        overview=data;overviewSeen=true;read();
      });
      if(sub)subscriptions.push(sub);
    }catch(error){console.warn("[game-library] download-overview subscription unavailable",error);}
    read();
    const timer=window.setInterval(read,1000);
    return ()=>{
      alive=false;window.clearInterval(timer);
      for(const subscription of subscriptions){
        try{subscription.unregister?.();}catch{/* Steam may already have closed it */}
      }
    };
  },[appId,nonSteam]);
  return snapshot.appId===appId?snapshot:{...EMPTY,appId};
}
