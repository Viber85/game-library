import {useEffect,useMemo,useRef,useState} from "react";
import {callable} from "@decky/api";
import {subscribeArtworkSettingsChanged} from "./steamGridArtwork";

export type GogOwnedGame={
  id:string;title:string;image:string;imageFallback?:string;background:string;
};
type ArtworkReply={status:string;cover:string|null;hero:string|null};
const fetchFallback=callable<[string,string,string],ArtworkReply>("gog_steamgriddb_art");
const artworkRequests=new Map<string,Promise<ArtworkReply>>();
const artworkCache=new Map<string,{value:ArtworkReply;until:number}>();
const EMPTY:ArtworkReply={status:"unavailable",cover:null,hero:null};

/** A GOG product ID is never presented to Steam as a synthetic AppID.
 * Only query SteamGridDB when native GOG artwork is absent or fails, and only
 * for visible tiles. Cached title matches are reused across tabs/details.
 */
function getGogSteamGridFallback(account:string,game:GogOwnedGame):Promise<ArtworkReply>{
  if(!account||!game.id||!game.title)return Promise.resolve(EMPTY);
  const key=[account,game.id,game.title.toLowerCase()].join(":");
  const cached=artworkCache.get(key);
  if(cached&&cached.until>Date.now())return Promise.resolve(cached.value);
  const pending=artworkRequests.get(key);
  if(pending)return pending;
  const job=fetchFallback(account,game.id,game.title).then(value=>{
    const safe=value&&typeof value==="object"?
      {status:String(value.status||"unavailable"),
       cover:typeof value.cover==="string"?value.cover:null,
       hero:typeof value.hero==="string"?value.hero:null}:EMPTY;
    const longLived=["ok","no_match","unavailable"].includes(safe.status);
    artworkCache.set(key,{value:safe,until:Date.now()+(longLived?30*60_000:30_000)});
    return safe;
  }).catch(()=>EMPTY).finally(()=>artworkRequests.delete(key));
  artworkRequests.set(key,job);
  return job;
}

/** GOG portrait, legacy CDN thumbnail and SteamGridDB fallback in priority order. */
export function GogArtwork({game,accountId,expanded=false}:{
  game:GogOwnedGame;accountId:string;expanded?:boolean;
}){
  const hostRef=useRef<HTMLDivElement>(null);
  const [visible,setVisible]=useState(expanded);
  const [index,setIndex]=useState(0);
  const [remote,setRemote]=useState<string|null>(null);
  const [triedRemote,setTriedRemote]=useState(false);
  const candidates=useMemo(()=>
    [...new Set([game.image,game.imageFallback].filter(
      (url):url is string=>typeof url==="string"&&url.startsWith("https://")
    ))],[game.image,game.imageFallback]);
  const image=candidates[index]||remote;

  useEffect(()=>{
    if(expanded){setVisible(true);return;}
    const element=hostRef.current;
    if(!element)return;
    if(typeof IntersectionObserver==="undefined"){
      // No bulk lookups on SteamOS builds without intersection observers.
      return;
    }
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        setVisible(true);
        observer.disconnect();
      }
    },{rootMargin:"180px"});
    observer.observe(element);
    return ()=>observer.disconnect();
  },[expanded,game.id]);

  useEffect(()=>subscribeArtworkSettingsChanged(()=>{
    artworkCache.clear();
    setTriedRemote(false);
    setRemote(null);
  }),[game.id]);

  useEffect(()=>{
    if(!visible||candidates[index]||triedRemote||!accountId)return;
    let active=true;
    setTriedRemote(true);
    void getGogSteamGridFallback(accountId,game).then(reply=>{
      if(active)setRemote(reply.cover);
    });
    return ()=>{active=false;};
  },[visible,index,candidates,accountId,game.id,game.title,triedRemote]);

  return <div ref={hostRef} className="gl-gog-artwork" aria-hidden="true">
    {image&&<img src={image} alt="" loading={expanded?"eager":"lazy"}
      onError={()=>{
        if(index<candidates.length)setIndex(value=>value+1);
        else setRemote(null);
      }}/>}
  </div>;
}
