import type {LibraryGame} from "./steam";
import type {SteamTab} from "./tabmaster";

const DAY_SECONDS=24*60*60;
const BUILTIN_TABS=new Set(["allgames","installed","favorites","nonsteam"]);
const SOURCE_TABS=new Set([
  "all games","installed","favorites","non-steam","steam","epic","gog",
]);

/** Use verified recent Steam timestamps. An unknown history is NOT played. */
export function continuePlayingGames(
  games:readonly LibraryGame[],nowSeconds=Math.floor(Date.now()/1000),
):LibraryGame[]{
  const cutoff=nowSeconds-30*DAY_SECONDS;
  return games.filter(game=>game.lastPlayed>=cutoff&&game.lastPlayed<=nowSeconds&&
    game.lastPlayed>0)
    .sort((a,b)=>b.lastPlayed-a.lastPlayed||a.title.localeCompare(b.title));
}

/** Custom tabs in the existing Steam/TabMaster source; do not create false
 * manual collections. Built-in and provider-only tabs stay in Library.
 */
export function personalCollectionTabs(tabs:readonly SteamTab[]):SteamTab[]{
  return tabs.filter(tab=>!BUILTIN_TABS.has(tab.id.toLowerCase())&&
    !SOURCE_TABS.has(tab.title.trim().toLowerCase()))
    .sort((a,b)=>a.position-b.position||a.title.localeCompare(b.title));
}
