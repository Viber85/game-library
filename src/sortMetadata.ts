import {callable} from "@decky/api";
import {requestHltbTimes,requestProtonRating} from "./metadataRequests";
import type {LibraryGame} from "./steam";
import {loadAchievements} from "./achievements";
import type {ExternalSortKind,SortData} from "./homeSort";

/**
 * v0.5.7 HLTB cache strategy:
 * - Read existing hltb_cache.json through ONE local Decky bulk RPC.
 * - Display Main + Extras immediately, even while expired data refreshes.
 * - Query HLTB remotely only for missing/expired titles, one at a time.
 * - Distinguish a fresh cached miss (12h) from an unknown game.
 * No bulk web requests and no new disk storage formats.
 */
type HltbBulkItem={
  id:number;
  title:string;
  extras:number|null;
  fresh:boolean;
  expires_in:number;
};
type HltbBulkReply={entries?:HltbBulkItem[]};

const hltbBulk=callable<[Array<{id:number;title:string}>],HltbBulkReply>(
  "hltb_cached_bulk");

const cached:{
  hltb:Map<number,number|null>;
  proton:Map<number,number|null>;
  achievement:Map<number,number|null>;
}={
  hltb:new Map(),proton:new Map(),achievement:new Map()
};
const ranks:Record<string,number>={
  borked:1,bronze:2,silver:3,gold:4,platinum:5
};
const inflight=new Map<string,Promise<number|null>>();
const bulkInflight=new Map<string,Promise<void>>();
const hltbTitles=new Map<number,string>();
const hltbReady=new Map<number,{title:string;until:number}>();

const HLTB_RETRY_MS=5*60_000;
const MAX_TTL_MS=7*86400_000;
const BULK_SIZE=400;

export const getSortData=():SortData=>cached;

function validHours(value:unknown):number|null{
  return typeof value==="number"&&Number.isFinite(value)&&value>0?value:null;
}
function readyHltb(g:LibraryGame):boolean{
  const entry=hltbReady.get(g.id);
  return entry?.title===g.title.trim()&&entry.until>Date.now()&&
    cached.hltb.has(g.id);
}
function ensureTitle(g:LibraryGame):void{
  const title=g.title.trim();
  if(hltbTitles.get(g.id)===title)return;
  hltbTitles.set(g.id,title);
  cached.hltb.delete(g.id);
  hltbReady.delete(g.id);
}
function markHltbReady(g:LibraryGame,seconds:number):void{
  const duration=Math.min(MAX_TTL_MS,Math.max(1000,seconds*1000));
  hltbReady.set(g.id,{title:g.title.trim(),until:Date.now()+duration});
}

/** Local-only: coalesce overlapping tab hydration; no remote HLTB calls. */
export function primeHltbCache(
  games:readonly LibraryGame[],onUpdate?:()=>void
):Promise<void>{
  const eligible=games.filter(g=>Number.isSafeInteger(g.id)&&g.id>0&&
    !!g.title.trim()).slice(0,5000);
  for(const g of eligible)ensureTitle(g);
  const needsDisk=eligible.filter(g=>!readyHltb(g));
  if(!needsDisk.length)return Promise.resolve();
  const key=needsDisk.map(g=>g.id+":"+g.title.trim()).join("|");
  let promise=bulkInflight.get(key);
  if(!promise){
    promise=(async()=>{
      for(let offset=0;offset<needsDisk.length;offset+=BULK_SIZE){
        const chunk=needsDisk.slice(offset,offset+BULK_SIZE);
        let response:HltbBulkReply;
        try{
          response=await hltbBulk(chunk.map(g=>({id:g.id,title:g.title.trim()})));
        }catch{
          // A failed local cache read must not block the existing safe,
          // rate-limited individual lookup path.
          continue;
        }
        const requested=new Map(chunk.map(g=>[g.id,g] as const));
        for(const entry of response?.entries??[]){
          if(!entry||!Number.isSafeInteger(entry.id)||
             requested.get(entry.id)?.title.trim()!==entry.title)continue;
          const original=requested.get(entry.id);
          if(!original||readyHltb(original))continue;
          cached.hltb.set(entry.id,validHours(entry.extras));
          if(entry.fresh&&typeof entry.expires_in==="number"&&
             Number.isFinite(entry.expires_in)&&entry.expires_in>0)
            markHltbReady(original,entry.expires_in);
          else hltbReady.delete(entry.id); // stale: keep value, refresh
        }
      }
    })().finally(()=>bulkInflight.delete(key));
    bulkInflight.set(key,promise);
  }
  return promise.then(()=>{onUpdate?.();});
}

export function sortMetadataProgress(kind:ExternalSortKind,games:readonly LibraryGame[]){
  const map=cached[kind];
  const known=(g:LibraryGame)=>
    kind==="achievement"&&
    typeof g.achievementsTotal==="number"&&g.achievementsTotal>0&&
    typeof g.achievementsUnlocked==="number";
  return {total:games.length,
    done:games.filter(g=>known(g)||(kind==="hltb"?readyHltb(g):map.has(g.id))).length};
}

async function lookup(g:LibraryGame,kind:ExternalSortKind):Promise<number|null>{
  try{
    if(kind==="hltb"){
      ensureTitle(g);
      const result=await requestHltbTimes(g.id,g.title);
      // HLTB comp_plus = Main + Extras; never derive an average from main.
      const hours=result?.status==="ok"?result.data?.extras:null;
      if(result?.status==="ok"||result?.status==="unavailable"){
        if(result.stale===true){
          // Keep a valid expired value through a provider outage.
          if(validHours(hours)!==null)
            cached.hltb.set(g.id,validHours(hours));
          else if(!cached.hltb.has(g.id))cached.hltb.set(g.id,null);
          markHltbReady(g,HLTB_RETRY_MS/1000);
        }else{
          cached.hltb.set(g.id,validHours(hours));
          const ttl=typeof result.expires_in==="number"&&
            Number.isFinite(result.expires_in)&&result.expires_in>0?
            result.expires_in:result.status==="unavailable"?12*3600:7*86400;
          markHltbReady(g,ttl);
        }
      }else{
        // A network failure is not a cache miss; preserve a stale hit and
        // throttle retry attempts so switching tabs cannot spam HLTB.
        if(!cached.hltb.has(g.id))cached.hltb.set(g.id,null);
        markHltbReady(g,HLTB_RETRY_MS/1000);
      }
      return cached.hltb.get(g.id)??null;
    }
    if(kind==="proton"){
      const result=await requestProtonRating(g.id,g.title,g.nonSteam);
      return result?.status==="ok"&&typeof result.tier==="string"?
        ranks[result.tier.toLowerCase()]??null:null;
    }
    if(g.nonSteam)return null; // Native achievements only for Steam AppIDs.
    const native=window as any;
    const result=await loadAchievements(g.id,native.SteamClient,native.appDetailsStore);
    return result.status==="ok"?result.progress:null;
  }catch{
    if(kind==="hltb"){
      if(!cached.hltb.has(g.id))cached.hltb.set(g.id,null);
      markHltbReady(g,HLTB_RETRY_MS/1000);
      return cached.hltb.get(g.id)??null;
    }
    return null;
  }
}

async function fetchOnce(g:LibraryGame,kind:ExternalSortKind):Promise<number|null>{
  const key=kind+":"+g.id+":"+g.title;
  const old=inflight.get(key);
  if(old)return old;
  const next=lookup(g,kind).finally(()=>inflight.delete(key));
  inflight.set(key,next);
  return next;
}

/**
 * HLTB sorts first hydrate the persisted JSON cache in bulk, then queue
 * ONLY missing/expired games. A fresh negative cache counts as finished.
 * Cancel the slow network queue on tab/sort changes. Existing HLTB lookups
 * remain limited to ONE request at a time.
 */
export function startSortMetadata(
  kind:ExternalSortKind,games:readonly LibraryGame[],onProgress:()=>void
):()=>void{
  let cancelled=false;
  async function run(){
    if(kind==="hltb"){
      await primeHltbCache(games,()=>{
        if(!cancelled)onProgress();
      });
      if(cancelled)return;
    }
    const map=cached[kind];
    const eligible=(g:LibraryGame)=>!(
      kind==="achievement"&&
      typeof g.achievementsTotal==="number"&&g.achievementsTotal>0&&
      typeof g.achievementsUnlocked==="number"
    );
    const todo=games.filter(g=>eligible(g)&&
      (kind==="hltb"?!readyHltb(g):!map.has(g.id)));
    let cursor=0;
    const count=kind==="hltb"?1:kind==="proton"?2:3;
    async function worker(){
      while(!cancelled){
        const g=todo[cursor++];
        if(!g)return;
        // A prior tab or selected game may have loaded the same title.
        if(kind==="hltb"&&readyHltb(g))continue;
        const value=await fetchOnce(g,kind);
        if(cancelled)return;
        map.set(g.id,value);
        onProgress();
        // Avoid overwhelming HLTB and ProtonDB for 400+ game tabs.
        if(kind!=="achievement")
          await new Promise<void>(resolve=>window.setTimeout(resolve,
            kind==="hltb"?650:250));
      }
    }
    for(let i=0;i<Math.min(count,todo.length);i++)void worker();
  }
  void run().catch(()=>{
    // A failed batch cache read must never crash Game Mode.
  });
  return ()=>{cancelled=true;};
}
