import {useEffect,useState} from "react";
import {
  readNativeGameStatus,resolveGameTransfer,
  type GameTransfer,type NativeGameStatus
} from "./steamDownloadProgressCore";

type NativeDownloads={
  RegisterForDownloadItems?:(cb:(initial:boolean,items:unknown)=>void)=>{unregister?:()=>void};
  RegisterForDownloadOverview?:(cb:(overview:unknown)=>void)=>{unregister?:()=>void};
};
type NativeSteam={
  SteamClient?:{Downloads?:NativeDownloads};
  appStore?:{GetAppOverviewByAppID?:(id:number)=>unknown};
  downloadsStore?:{m_DownloadItems?:unknown;m_DownloadOverview?:unknown};
};
export type GameDownloadSnapshot=NativeGameStatus&{appId:number;transfer:GameTransfer|null};

const EMPTY:GameDownloadSnapshot={appId:0,installed:null,displayStatus:null,transfer:null};
const same=(a:GameDownloadSnapshot,b:GameDownloadSnapshot)=>
  a.appId===b.appId&&a.installed===b.installed&&
  a.displayStatus===b.displayStatus&&a.transfer?.phase===b.transfer?.phase&&
  a.transfer?.percent===b.transfer?.percent;

/** Subscribes only while the selected Steam game's Details are mounted.
 * Steam's own queue and app overview are authoritative; this never starts
 * an installation or manufactures progress data.
 */
export function useSteamGameDownload(appId:number,nonSteam:boolean):GameDownloadSnapshot{
  const [snapshot,setSnapshot]=useState<GameDownloadSnapshot>(EMPTY);
  useEffect(()=>{
    if(nonSteam||!Number.isSafeInteger(appId)||appId<=0||appId>=0x80000000){
      setSnapshot({...EMPTY,appId});
      return;
    }
    const host=window as unknown as NativeSteam;
    const downloads=host.SteamClient?.Downloads;
    let active=true;
    let items:unknown=host.downloadsStore?.m_DownloadItems;
    let overview:unknown=host.downloadsStore?.m_DownloadOverview;
    const read=()=>{
      if(!active)return;
      let app:unknown;
      try{app=host.appStore?.GetAppOverviewByAppID?.(appId);}
      catch(error){console.warn("[game-library] download overview unavailable",error);}
      const state=readNativeGameStatus(app);
      const transfer=resolveGameTransfer(appId,items,overview,state.displayStatus);
      const next:GameDownloadSnapshot={appId,...state,transfer};
      setSnapshot(old=>same(old,next)?old:next);
    };
    const subs:{unregister?:()=>void}[]=[];
    try{
      const reg=downloads?.RegisterForDownloadItems?.((_initial,list)=>{
        items=list;
        read();
      });
      if(reg)subs.push(reg);
    }catch(error){console.warn("[game-library] Steam download list unavailable",error);}
    try{
      const reg=downloads?.RegisterForDownloadOverview?.(value=>{
        overview=value;
        read();
      });
      if(reg)subs.push(reg);
    }catch(error){console.warn("[game-library] Steam download progress unavailable",error);}
    read();
    // Some Steam builds update the overview before the download callback.
    // Polling only the selected game's in-memory native data covers that gap.
    const timer=window.setInterval(read,1000);
    return ()=>{
      active=false;
      window.clearInterval(timer);
      for(const reg of subs){
        try{reg.unregister?.();}catch{/* Steam may have disposed the handler */}
      }
    };
  },[appId,nonSteam]);
  return snapshot.appId===appId?snapshot:{...EMPTY,appId};
}
