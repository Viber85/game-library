import {callable} from "@decky/api";
import {useEffect,useState} from "react";
import {MdStorage} from "react-icons/md";
import type {LibraryGame} from "./steam";

export type StoreSizeReply={
  status:"estimated"|"unavailable"|"rate_limited"|"error"|"invalid"|"deferred";
  estimated_gb?:number;
  source?:"steam_store";
  platform?:"pc"|"linux";
  requirement?:"minimum"|"recommended";
  retry_after?:number;
  cached?:boolean;
};

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

  if(game.nonSteam)return null;
  const nativeGb=native!==null?native/1_000_000_000:null;
  const estimate=native===null&&remote&&validStoreSize(remote)?remote:null;
  const value=nativeGb!==null?nativeGb:estimate?.estimated_gb;
  const formatted=value!==undefined&&value!==null?
    (value<10?value.toFixed(1):Math.round(value).toString())+" GB":null;
  const label=nativeGb!==null?"SIZE":estimate?"EST.":"SIZE";
  const text=nativeGb!==null?formatted:estimate?"~"+formatted:"—";
  const title=nativeGb!==null?
    "Installed size · Steam local size_on_disk":
    estimate?"Estimated storage requirement from Steam Store ("+
      (estimate.platform==="linux"?"Linux":"Windows / Proton")+", "+
      (estimate.requirement==="recommended"?"recommended":"minimum")+
      "); not an exact download or installed size":
    "Storage size unknown · select this game to check Steam Store requirements";
  return <span className="gl-poster-size" title={title} aria-label={title}>
    <MdStorage aria-hidden="true"/>
    <small>{label}</small><strong>{text}</strong>
  </span>;
}
