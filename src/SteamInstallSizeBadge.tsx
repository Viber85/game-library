import {callable} from "@decky/api";
import {useEffect,useState} from "react";
import {MdStorage} from "react-icons/md";
import {getActiveUserId,protonDbAppId,type LibraryGame} from "./steam";
import {sameStoreGameTitle} from "./installSizeReference";
import {readNativeRequiredInstallBytes,subscribeNativeRequiredInstallBytes} from "./steamNativeRequiredSize";

export type StoreSizeReply={
  status:"estimated"|"unavailable"|"rate_limited"|"error"|"invalid"|"deferred";
  estimated_gb?:number;
  steam_title?:string;
  source?:"steam_store";
  platform?:"pc"|"linux";
  requirement?:"minimum"|"recommended";
  retry_after?:number;
  cached?:boolean;
};

export type NonSteamSizeReply={
  status:"ok"|"unavailable"|"invalid";
  size_bytes?:number;
  source?:"flatpak"|"appimage"|"windows_game";
  reason?:"shortcut_not_found"|"unsupported_target"|"flatpak_size_unavailable"|"game_folder_unavailable";
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
const storeSizeListeners=new Map<number,Set<(reply:StoreSizeReply)=>void>>();
const pending=new Map<number,Promise<StoreSizeReply>>();
const cachedBulk=callable<[number[]],{entries?:Array<{appid:number}&StoreSizeReply>}>(
  "steam_size_cached_bulk");
let inflightBulk:Promise<void>|null=null;
/** Only hydrate the plugin's own on-disk cache. This performs no Store HTTP
 * request and makes previously resolved uninstalled sizes visible on return. */
export function hydrateCachedSteamSizes(ids:readonly number[]):Promise<void>{
  if(inflightBulk)return inflightBulk;
  const valid=[...new Set(ids.filter(id=>
    Number.isSafeInteger(id)&&id>0&&id<=0xffffffff))].slice(0,1000);
  if(!valid.length)return Promise.resolve();
  const allowed=new Set(valid);
  inflightBulk=cachedBulk(valid).then(result=>{
    for(const item of result?.entries??[]){
      if(!allowed.has(item.appid)||!validStoreSize(item))continue;
      localStoreCache.set(item.appid,item);
      for(const cb of storeSizeListeners.get(item.appid)??[])cb(item);
    }
  }).catch(()=>{}).finally(()=>{inflightBulk=null;});
  return inflightBulk;
}

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
    if(reply.status!=="deferred"){
      localStoreCache.set(id,reply);
      for(const cb of storeSizeListeners.get(id)??[])cb(reply);
    }
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
 * Cross-store comparisons require a verified Steam product ID; no guessing.
 */
export function SteamInstallSizeBadge({game,active}:{
  game:LibraryGame;active:boolean;
}){
  // Cross-store Steam requirements are only a comparison for an already
  // verified Steam AppID. A similarly named game is NOT sufficient evidence.
  // A source may have linked an AppID in Steam overview metadata, but we
  // never call another plugin or guess a product from its title.
  const referenceAppId=game.nonSteam&&!game.installed?protonDbAppId(game):null;
  const storeAppId=!game.nonSteam?game.id:referenceAppId;
  const [remote,setRemote]=useState<StoreSizeReply|null>(
    ()=>storeAppId!==null?localStoreCache.get(storeAppId)??null:null);
  const [nonSteam,setNonSteam]=useState<NonSteamSizeReply|null>(null);
  useEffect(()=>{
    if(storeAppId===null)return;
    const callback=(reply:StoreSizeReply)=>setRemote(reply);
    const listeners=storeSizeListeners.get(storeAppId)??new Set<(reply:StoreSizeReply)=>void>();
    listeners.add(callback);
    storeSizeListeners.set(storeAppId,listeners);
    const hit=localStoreCache.get(storeAppId);
    if(hit)setRemote(hit);
    return ()=>{
      listeners.delete(callback);
      if(!listeners.size)storeSizeListeners.delete(storeAppId);
    };
  },[storeAppId]);
  const [requiredFromSteam,setRequiredFromSteam]=useState<number|null>(()=>
    !game.nonSteam&&!game.installed?readNativeRequiredInstallBytes(game.id):null);
  const native=game.installed&&typeof game.sizeBytes==="number"&&
    Number.isFinite(game.sizeBytes)&&game.sizeBytes>0?game.sizeBytes:null;
  const nativeRequired=!game.nonSteam&&!game.installed?
    (typeof game.requiredBytes==="number"&&game.requiredBytes>0?
      game.requiredBytes:requiredFromSteam):null;
  useEffect(()=>{
    if(game.nonSteam||game.installed)return;
    let live=true;
    const current=readNativeRequiredInstallBytes(game.id);
    if(current!==null)setRequiredFromSteam(current);
    if(!active)return;
    const stop=subscribeNativeRequiredInstallBytes(game.id,bytes=>{
      if(live)setRequiredFromSteam(bytes);
    });
    return ()=>{live=false;stop();};
  },[game.id,game.installed,game.nonSteam,active]);

  useEffect(()=>{
    let mounted=true;
    let timer:number|undefined;
    if(storeAppId!==null&&active&&native===null&&nativeRequired===null){
      let attempts=0;
      const load=()=>{
        attempts++;
        void readEstimate(storeAppId).then(reply=>{
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
      setRemote(storeAppId!==null?localStoreCache.get(storeAppId)??null:null);
    }
    return ()=>{mounted=false;if(timer!==undefined)window.clearTimeout(timer);};
  },[storeAppId,active,native,nativeRequired]);

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
  const requiredGb=nativeRequired!==null?nativeRequired/1_000_000_000:null;
  const estimate=storeAppId!==null&&native===null&&remote&&validStoreSize(remote)&&
    (!game.nonSteam||sameStoreGameTitle(game.title,remote.steam_title))?
    remote:null;
  const value=nativeGb!==null?nativeGb:
    nonSteamGb!==null?nonSteamGb:
    requiredGb!==null?requiredGb:estimate?.estimated_gb;
  const formatted=value!==undefined&&value!==null?
    value<.1?Math.max(1,Math.round(value*1000))+" MB":
    (value<10?value.toFixed(1):Math.round(value).toString())+" GB":null;
  const text=nativeGb!==null||nonSteamGb!==null?formatted:
    requiredGb!==null?"~"+formatted:
    estimate?"~"+formatted:"—";
  const title=nonSteamGb!==null?
    nonSteam?.source==="flatpak"?
      "Flatpak app installed size · excludes shared runtimes and user data":
      nonSteam?.source==="windows_game"?
        "Local game folder size · excludes Proton prefix, shader cache and linked files":
        "AppImage file size · excludes downloaded data and extracted cache":
    nativeGb!==null?
    "Installed size · Steam local size_on_disk":
    requiredGb!==null?
    "SteamOS required disk space for installation; may change with updates and selected components":
    estimate?game.nonSteam?
      "Steam reference only · estimated storage requirement for the matching Steam release ("+
      (estimate.platform==="linux"?"Linux":"Windows / Proton")+", "+
      (estimate.requirement==="recommended"?"recommended":"minimum")+
      "). Epic / GOG versions may differ; not the installed or download size":
      "Estimated storage requirement from Steam Store ("+
      (estimate.platform==="linux"?"Linux":"Windows / Proton")+", "+
      (estimate.requirement==="recommended"?"recommended":"minimum")+
      "); not an exact download or installed size":
    game.nonSteam&&!game.installed?
      storeAppId===null?
        "Uninstalled non-Steam title · no verified store product ID. Epic/GOG store-size integration is not available yet":
        "No verified title match for the linked Steam reference. Store-specific Epic/GOG size integration is not available yet":
    game.nonSteam?
      "Local size unknown · "+(nonSteam?.reason==="shortcut_not_found"?
        "Steam shortcut not found":nonSteam?.reason==="flatpak_size_unavailable"?
        "Flatpak size unavailable":nonSteam?.reason==="unsupported_target"?
        "Unsupported shortcut target":nonSteam?.reason==="game_folder_unavailable"?
        "Game folder unavailable or too broad":"select game to inspect its local shortcut"):
      "Storage size unknown · select this game to check Steam Store requirements";
  return <span className="gl-poster-size" title={title} aria-label={title}>
    <MdStorage aria-hidden="true"/>
    <strong>{text}</strong>
  </span>;
}
