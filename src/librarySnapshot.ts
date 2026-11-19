import type {LibraryGame} from "./steam";

/**
 * Steam refreshes CAppOverview about every 15s. Its getter constructs a
 * brand-new game array even when no user's library metadata has changed.
 * Comparing only the primitive fields actually used by Game Library avoids
 * unnecessary React state updates, full tab recalculation and grid re-sorts.
 *
 * Keep every displayed/sorted field here so true updates (artwork, installs,
 * achievements, metadata, title, etc.) are always reflected in Game Mode.
 */
const GAME_FIELDS=[
  "id","title","installed","favorite","nonSteam",
  "lastPlayed","playtimeMinutes","playtimeKnown",
  "addedAt","releaseDate","sizeBytes",
  "achievementsUnlocked","achievementsTotal",
  "poster","hero"
] as const satisfies readonly (keyof LibraryGame)[];

export function sameLibraryGames(
  previous:readonly LibraryGame[],next:readonly LibraryGame[]
):boolean{
  if(previous===next)return true;
  if(previous.length!==next.length)return false;
  for(let i=0;i<next.length;i++){
    const before=previous[i],after=next[i];
    if(before===after)continue;
    for(const field of GAME_FIELDS){
      if(before[field]!==after[field])return false;
    }
  }
  return true;
}

/**
 * Installed/Favorites/TabMaster/UnifiedDeck collections can change while
 * every game's CAppOverview stays byte-for-byte the same.
 * Keep their membership in the refresh signature: otherwise skipping an
 * unchanged game snapshot would leave the grid and count stale.
 */
export function libraryTabSignature<T extends {id:string}>(
  tabs:readonly T[],
  games:LibraryGame[],
  resolve:(tab:T,items:LibraryGame[])=>{supported:boolean;games:LibraryGame[]}
):string{
  return JSON.stringify(tabs.map(tab=>{
    const result=resolve(tab,games);
    return [tab.id,result.supported,result.games.map(game=>game.id)];
  }));
}
