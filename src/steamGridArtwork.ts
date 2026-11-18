import {callable} from "@decky/api";
import type {LibraryGame} from "./steam";

/** Missing-art-only lookup. SteamGridDB key never crosses into Game Mode JS. */
export type ArtworkReply = {
  status:string;
  cover:string|null;
  hero:string|null;
  cached?:boolean;
};

const queryArt=callable<[number,string,boolean],ArtworkReply>("steamgriddb_art");
const inFlight=new Map<string,Promise<ArtworkReply>>();
const results=new Map<string,{value:ArtworkReply;until:number}>();
const empty:ArtworkReply={status:"unavailable",cover:null,hero:null};
const settingsListeners=new Set<()=>void>();

/** Components retry previously missing images when the key/toggle changes. */
export function subscribeArtworkSettingsChanged(listener:()=>void):()=>void{
  settingsListeners.add(listener);
  return ()=>{settingsListeners.delete(listener);};
}


/** Prevent repeated 404s and duplicate lookups from many concurrently rendered cards. */
export function clearArtworkLookupCache(){
  inFlight.clear();
  results.clear();
  for(const listener of settingsListeners)listener();
}

export function getMissingSteamArt(game:LibraryGame):Promise<ArtworkReply>{
  if(game.nonSteam||!Number.isSafeInteger(game.id)||game.id<=0||!game.title.trim())
    return Promise.resolve(empty);
  const key=game.id+":"+game.title.trim().toLowerCase();
  const cached=results.get(key);
  if(cached && cached.until>Date.now())return Promise.resolve(cached.value);
  const existing=inFlight.get(key);
  if(existing)return existing;
  const job=queryArt(game.id,game.title,false).then(reply=>{
    const safe:ArtworkReply=reply&&typeof reply==="object"?
      {status:String(reply.status||"unavailable"),
        cover:typeof reply.cover==="string"?reply.cover:null,
        hero:typeof reply.hero==="string"?reply.hero:null} : empty;
    const success=safe.status==="ok"||safe.status==="no_match"||
      safe.status==="unavailable";
    // Success/no-match persists across the Home session. Network errors,
    // missing user API key and opt-out are retried after a short interval.
    results.set(key,{value:safe,until:Date.now()+(success?30*60_000:30_000)});
    return safe;
  }).catch(()=>empty).finally(()=>inFlight.delete(key));
  inFlight.set(key,job);
  return job;
}
