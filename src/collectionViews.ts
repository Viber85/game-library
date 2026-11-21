import type {LibraryGame} from "./steam";
import type {LibraryTab} from "./libraryTabs";

const DAY_SECONDS=24*60*60;

/** Use verified recent Steam timestamps. An unknown history is NOT played. */
export function continuePlayingGames(
  games:readonly LibraryGame[],nowSeconds=Math.floor(Date.now()/1000),
):LibraryGame[]{
  const cutoff=nowSeconds-30*DAY_SECONDS;
  return games.filter(game=>game.lastPlayed>=cutoff&&game.lastPlayed<=nowSeconds&&
    game.lastPlayed>0)
    .sort((a,b)=>b.lastPlayed-a.lastPlayed||a.title.localeCompare(b.title));
}

/** Only custom tabs created inside Game Library are user collections. */
export function personalCollectionTabs(tabs:readonly LibraryTab[]):LibraryTab[]{
  return tabs.filter(tab=>tab.kind==="custom"&&tab.visible)
    .sort((a,b)=>a.position-b.position||a.title.localeCompare(b.title));
}
