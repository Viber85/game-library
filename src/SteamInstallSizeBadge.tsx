import {callable} from "@decky/api";
import {useEffect,useState} from "react";
import {MdStorage} from "react-icons/md";
import {getActiveUserId,type LibraryGame} from "./steam";

export type StoreSizeReply={
  status:"estimated"|"unavailable"|"rate_limited"|"error"|"invalid"|"deferred";
  estimated_gb?:number;
  source?:"steam_store";
  platform?:"pc"|"linux";
  requirement?:"minimum"|"recommended";
  retry_after?:number;
  cached?:boolean;
};

export type NonSteamSizeReply={
  status:"ok"|"unavailable"|"invalid";
  size_bytes?:number;
  source?:"flatpak"|"appimage";
  reason?:"shortcut_not_found"|"unsupported_target"|"flatpak_size_unavailable";
};

const requestNonSteamSize=callable<[number,string,string],NonSteamSizeReply>(
  "nonsteam_install_size");
const nonSteamCache=new Map<string,{reply:NonSteamSizeReply;until:number}>();
const getNonSteamCached=(key:string):NonSteamSizeReply|null=>{
  const item=nonSteamCache.get(key);
  if(!item)return null;
  if(item.until<=Date.now()){nonSteamCache.delete(key);return null;}
  return item.reply;
};
const nonSteamPending=new Map<string,Promise<NonSteamSizeReply>>();
const nonSteamKey=(id:number,title:string,user:string)=>user+":"+id+":"+title;
function readNonSteamSize(id:number,title:string,user:string):Promise<NonSteamSizeReply>{
  const key=nonSteamKey(id,title,user);
  const cached=getNonSteamCached(key);
  if(cached)return Promise.resolve(cached);
  const inflight=nonSteamPending.get(key);
  if(inflight)return inflight;
  const pending=requestNonSteamSize(id,title,user).then(result=>{
    const reply:NonSteamSizeReply=result?.status==="ok"&&
      typeof result.size_bytes==="number"&&Number.isFinite(result.size_bytes)&&
      result.size_bytes>0?result:{status:"unavailable",reason:result?.reason};
    if(reply.status!=="ok"&&reply.reason)
      console.info("[game-library] non-Steam size unavailable:",reply.reason);
    nonSteamCache.set(key,{
      reply,until:Date.now()+(reply.status==="ok"?15*60_000:2*60_000)
    });
    return reply;
  },()=>({status:"unavailable"} as NonSteamSizeReply))
    .finally(()=>nonSteamPending.delete(key));
  nonSteamPending.set(key,pending);
  return pending;
}

const requestSteamStore=callable<[number],StoreSizeReply>("steam_install_size");
const localStoreCache=new Map<number,StoreSizeReply>();
const pending=new Map<number,Promise<StoreSizeReply>>();

function validStoreSize(result:StoreSizeReply):boolean{
  return result.status==="estimated"&&
    typeof result.estimated_gb==="number"&&
    Number.isFinite(result.estimated_gb)&&
    result.estimated_gb>=.05&&result.estimated_gb<=3000;
}

function readEstimate(id:number):Promise<StoreSizeReply>{
  const known=localStoreCache.get(id);
  if(known&&known.status!=="deferred")return Promise.resolve(known);
  const inflight=pending.get(id);
  if(inflight)return inflight;
  const started=requestSteamStore(id).then(result=>{
    const valid=result&&typeof result.status==="string";
    const reply:StoreSizeReply=valid?result:{status:"error"};
    if(reply.status!=="deferred")localStoreCache.set(id,reply);
    return reply;
  },()=>({status:"error"} as StoreSizeReply))
    .finally(()=>pending.delete(id));
  pending.set(id,started);
  return started;
}

/** Show a small truthful size label in the Library-only grid.
 * Steam's local size_on_disk is authoritative ONLY for installed titles.
 * A Store minimum requirement is NEVER described as installed bytes.
 * Store requests start only after a selected card stays focused for 850 ms.
 */
export function SteamInstallSizeBadge({game,active}:{
  game:LibraryGame;active:boolean;
}){
  const [remote,setRemote]=useState<StoreSizeReply|null>(
    ()=>localStoreCache.get(game.id)??null);
  const [nonSteam,setNonSteam]=useState<NonSteamSizeReply|null>(null);
  const native=game.installed&&typeof game.sizeBytes==="number"&&
    Number.isFinite(game.sizeBytes)&&game.sizeBytes>0?game.sizeBytes:null;

  useEffect(()=>{
    let mounted=true;
    let timer:number|undefined;
    if(!game.nonSteam&&active&&native===null){
      let attempts=0;
      const load=()=>{
        attempts++;
        void readEstimate(game.id).then(reply=>{
          if(!mounted)return;
          if(reply.status==="deferred"&&attempts<3){
            const seconds=typeof reply.retry_after==="number"&&
              Number.isFinite(reply.retry_after)?reply.retry_after:3;
            timer=window.setTimeout(load,Math.ceil(Math.min(30,Math.max(.2,seconds))*1000));
          }else{
            setRemote(reply);
          }
        });
      };
      timer=window.setTimeout(load,850);
    }else if(!active){
      setRemote(localStoreCache.get(game.id)??null);
    }
    return ()=>{mounted=false;if(timer!==undefined)window.clearTimeout(timer);};
  },[game.id,game.nonSteam,active,native]);

  useEffect(()=>{
    if(!game.nonSteam||!game.installed||!active||native!==null)return;
    let mounted=true;
    const user=getActiveUserId();
    const key=nonSteamKey(game.id,game.title,user);
    const cached=getNonSteamCached(key);
    if(cached){
      setNonSteam(cached);
      return;
    }
    const timer=window.setTimeout(()=>{
      void readNonSteamSize(game.id,game.title,user).then(result=>{
        if(mounted)setNonSteam(result);
      });
    },400);
    return ()=>{mounted=false;window.clearTimeout(timer);};
  },[game.id,game.title,game.installed,game.nonSteam,active,native]);

  const nativeGb=native!==null?native/1_000_000_000:null;
  const nonSteamBytes=game.nonSteam&&game.installed&&nonSteam?.status==="ok"&&
    typeof nonSteam.size_bytes==="number"&&nonSteam.size_bytes>0?
      nonSteam.size_bytes:null;
  const nonSteamGb=nonSteamBytes!==null?nonSteamBytes/1_000_000_000:null;
  const estimate=!game.nonSteam&&native===null&&remote&&validStoreSize(remote)?
    remote:null;
  const value=nativeGb!==null?nativeGb:
    nonSteamGb!==null?nonSteamGb:estimate?.estimated_gb;
  const formatted=value!==undefined&&value!==null?
    value<.1?Math.max(1,Math.round(value*1000))+" MB":
    (value<10?value.toFixed(1):Math.round(value).toString())+" GB":null;
  const label=nativeGb!==null?"SIZE":estimate?"EST.":"SIZE";
  const text=nativeGb!==null||nonSteamGb!==null?formatted:
    estimate?"~"+formatted:"—";
  const title=nonSteamGb!==null?
    nonSteam?.source==="flatpak"?
      "Flatpak app installed size · excludes shared runtimes and user data":
      "AppImage file size · excludes downloaded data and extracted cache":
    nativeGb!==null?
    "Installed size · Steam local size_on_disk":
    estimate?"Estimated storage requirement from Steam Store ("+
      (estimate.platform==="linux"?"Linux":"Windows / Proton")+", "+
      (estimate.requirement==="recommended"?"recommended":"minimum")+
      "); not an exact download or installed size":
    game.nonSteam?
      "Local size unknown · "+(nonSteam?.reason==="shortcut_not_found"?
        "Steam shortcut not found":nonSteam?.reason==="flatpak_size_unavailable"?
        "Flatpak size unavailable":nonSteam?.reason==="unsupported_target"?
        "Unsupported shortcut target":"select game to inspect its local shortcut"):
      "Storage size unknown · select this game to check Steam Store requirements";
  return <span className="gl-poster-size" title={title} aria-label={title}>
    <MdStorage aria-hidden="true"/>
    <small>{label}</small><strong>{text}</strong>
  </span>;
}
