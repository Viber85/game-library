import {callable} from "@decky/api";
import type {LibraryGame} from "./steam";
import {loadAchievements} from "./achievements";
import type {ExternalSortKind,SortData} from "./homeSort";

/** On-demand metadata. Nothing is fetched for normal A-Z/Recent sorting.
 * Game Mode can have hundreds of Steam+Epic+GOG entries, so do not fire
 * hundreds of requests at once. Missing values sort last until resolved.
 */
const hltb=callable<[number,string],{
  status:string;data?:{extras?:number|null}|null;
}>("hltb_times");
const proton=callable<[number,string,boolean],{
  status:string;tier?:string|null;
}>("protondb_for_game");

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

export const getSortData=():SortData=>cached;

export function sortMetadataProgress(kind:ExternalSortKind,games:readonly LibraryGame[]){
  const map=cached[kind];
  const known=(g:LibraryGame)=>
    kind==="achievement"&&
    typeof g.achievementsTotal==="number"&&g.achievementsTotal>0&&
    typeof g.achievementsUnlocked==="number";
  return {total:games.length,
    done:games.filter(g=>known(g)||map.has(g.id)).length};
}

async function lookup(g:LibraryGame,kind:ExternalSortKind):Promise<number|null>{
  try{
    if(kind==="hltb"){
      const result=await hltb(g.id,g.title);
      // HLTB comp_plus = Main + Extras; never derive an average from main.
      const hours=result?.status==="ok"?result.data?.extras:null;
      return typeof hours==="number"&&Number.isFinite(hours)&&hours>0?
        hours:null;
    }
    if(kind==="proton"){
      const result=await proton(g.id,g.title,g.nonSteam);
      return result?.status==="ok"&&typeof result.tier==="string"?
        ranks[result.tier.toLowerCase()]??null:null;
    }
    if(g.nonSteam)return null; // Native achievements only for Steam AppIDs.
    const native=window as any;
    const result=await loadAchievements(g.id,native.SteamClient,native.appDetailsStore);
    return result.status==="ok"?result.progress:null;
  }catch{return null;}
}

async function fetchOnce(g:LibraryGame,kind:ExternalSortKind):Promise<number|null>{
  const key=kind+":"+g.id;
  const old=inflight.get(key);
  if(old)return old;
  const next=lookup(g,kind).finally(()=>inflight.delete(key));
  inflight.set(key,next);
  return next;
}

/**
 * Cancel queueing on tab/sort/page changes. Awaited requests finish safely,
 * while no unneeded games are queried after a view unmounts.
 * HLTB's unofficial endpoint is throttled to ONE concurrent request.
 */
export function startSortMetadata(
  kind:ExternalSortKind,games:readonly LibraryGame[],onProgress:()=>void
):()=>void{
  let cancelled=false;
  const map=cached[kind];
  const eligible=(g:LibraryGame)=>!(
    kind==="achievement"&&
    typeof g.achievementsTotal==="number"&&g.achievementsTotal>0&&
    typeof g.achievementsUnlocked==="number"
  );
  const todo=games.filter(g=>eligible(g)&&!map.has(g.id));
  let cursor=0;
  const count=kind==="hltb"?1:kind==="proton"?2:3;
  async function worker(){
    while(!cancelled){
      const g=todo[cursor++];
      if(!g)return;
      const value=await fetchOnce(g,kind);
      if(cancelled)return;
      map.set(g.id,value);
      onProgress();
      // Avoid overwhelming HLTB or ProtonDB when a tab has 400+ games.
      if(kind!=="achievement")
        await new Promise<void>(resolve=>window.setTimeout(resolve,
          kind==="hltb"?650:250));
    }
  }
  for(let i=0;i<Math.min(count,todo.length);i++)void worker();
  return ()=>{cancelled=true;};
}
