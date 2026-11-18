import type {LibraryGame} from "./steam";

/** 11 criteria; selectable reverse directions are extra actions, not new criteria. */
export const SORT_OPTIONS=[
  {id:"recent",label:"Recently Played",short:"Recent"},
  {id:"alphabetical",label:"Alphabetical · A–Z",short:"A–Z"},
  {id:"alphabetical-desc",label:"Alphabetical · Z–A",short:"Z–A"},
  {id:"most-played",label:"Most Played",short:"Most played"},
  {id:"least-played",label:"Least Played",short:"Least played"},
  {id:"never-played",label:"Never Played",short:"Never played"},
  {id:"recently-added",label:"Recently Added",short:"Added"},
  {id:"release-new",label:"Release Date · Newest first",short:"New releases"},
  {id:"release-old",label:"Release Date · Oldest first",short:"Old releases"},
  {id:"hltb-short",label:"HowLongToBeat · Shortest (Main + Extras)",short:"HLTB ↑"},
  {id:"hltb-long",label:"HowLongToBeat · Longest (Main + Extras)",short:"HLTB ↓"},
  {id:"proton-high",label:"ProtonDB · Best rated",short:"ProtonDB ↑"},
  {id:"proton-low",label:"ProtonDB · Lowest rated",short:"ProtonDB ↓"},
  {id:"achievement-high",label:"Achievements · Most complete",short:"Achievements ↑"},
  {id:"achievement-low",label:"Achievements · Least complete",short:"Achievements ↓"},
  {id:"size-small",label:"Game Size · Smallest",short:"Size ↑"},
  {id:"size-large",label:"Game Size · Largest",short:"Size ↓"},
] as const;

export type HomeSort=typeof SORT_OPTIONS[number]["id"];
export type HomeSortTab={id:string;title:string};
export type ExternalSortKind="hltb"|"proton"|"achievement";
export type SortData={
  hltb:ReadonlyMap<number,number|null>;
  proton:ReadonlyMap<number,number|null>;
  achievement:ReadonlyMap<number,number|null>;
};
export const SORT_CRITERIA_COUNT=11;

export function defaultSortForTab(tab:HomeSortTab):HomeSort {
  const normalize=(value:string)=>value.trim().toLowerCase().replace(/[\s_-]+/g,"");
  return normalize(tab.id)==="installed"||normalize(tab.title)==="installed"
    ?"recent":"alphabetical";
}
export function sortForTab(tab:HomeSortTab,overrides:Record<string,HomeSort>):HomeSort{
  return overrides[tab.id]??defaultSortForTab(tab);
}
export function sortLabel(id:HomeSort):string{
  return SORT_OPTIONS.find(o=>o.id===id)?.short??"A–Z";
}
export function externalSortKind(id:HomeSort):ExternalSortKind|null{
  if(id==="hltb-short"||id==="hltb-long")return "hltb";
  if(id==="proton-high"||id==="proton-low")return "proton";
  if(id==="achievement-high"||id==="achievement-low")return "achievement";
  return null;
}
const positive=(v:number|null|undefined):number|null=>
  typeof v==="number"&&Number.isFinite(v)&&v>0?v:null;

export function sortGames(games:readonly LibraryGame[],mode:HomeSort,
                          data?:Partial<SortData>):LibraryGame[]{
  const alphabet=(a:LibraryGame,b:LibraryGame)=>
    a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:"base"})||a.id-b.id;
  if(mode==="alphabetical")return [...games].sort(alphabet);
  if(mode==="alphabetical-desc")return [...games].sort((a,b)=>-alphabet(a,b));
  const ascending=mode==="least-played"||mode==="release-old"||
    mode==="hltb-short"||mode==="proton-low"||mode==="achievement-low"||
    mode==="size-small";
  const metric=(game:LibraryGame):number|null=>{
    switch(mode){
      case "recent":return positive(game.lastPlayed);
      case "most-played":case "least-played":
        return game.playtimeKnown!==false&&Number.isFinite(game.playtimeMinutes)&&
          game.playtimeMinutes>=0?game.playtimeMinutes:null;
      case "never-played":
        return game.playtimeKnown===false?null:
          game.playtimeMinutes===0&&game.lastPlayed===0?1:0;
      case "recently-added":return positive(game.addedAt);
      case "release-new":case "release-old":return positive(game.releaseDate);
      case "size-small":case "size-large":return positive(game.sizeBytes);
      // HLTB comp_plus / Main + Extras only, never "main" or completionist.
      case "hltb-short":case "hltb-long":return positive(data?.hltb?.get(game.id));
      case "proton-high":case "proton-low":return positive(data?.proton?.get(game.id));
      case "achievement-high":case "achievement-low":{
        const fromOverview=typeof game.achievementsTotal==="number"&&
          game.achievementsTotal>0&&typeof game.achievementsUnlocked==="number"?
          100*game.achievementsUnlocked/game.achievementsTotal:null;
        const fromQuery=data?.achievement?.get(game.id);
        return fromOverview!==null?fromOverview:
          (typeof fromQuery==="number"&&Number.isFinite(fromQuery)&&fromQuery>=0?
          fromQuery:null);
      }
      default:return null;
    }
  };
  return [...games].sort((a,b)=>{
    const av=metric(a),bv=metric(b);
    if(av===null&&bv!==null)return 1;
    if(bv===null&&av!==null)return -1;
    if(av!==null&&bv!==null&&av!==bv)
      return ascending?av-bv:bv-av;
    return alphabet(a,b);
  });
}
