import type {LibraryGame} from "./steam";
import type {GogOwnedGame} from "./GogArtwork";
import type {HomeSort} from "./homeSort";
import {normalizeSearchText,type SearchSource,type SearchInstall} from "./librarySearch.ts";
import {fromGogLibraryGame,fromSteamLibraryGame,type UnifiedLibraryGame} from "./unifiedLibraryGame.ts";

/** Dashboard-specific view of a provider-owned game. Native Steam IDs never
 * masquerade as GOG product IDs and vice versa. */
export type DashboardEntry =
  | {store:"steam";key:string;title:string;steam:LibraryGame}
  | {store:"gog";key:string;title:string;gog:GogOwnedGame};

export const steamEntry=(game:LibraryGame):DashboardEntry=>({
  store:"steam",key:fromSteamLibraryGame(game).key,title:game.title,steam:game,
});
export const gogEntry=(game:GogOwnedGame):DashboardEntry=>({
  store:"gog",key:fromGogLibraryGame(game).key,title:game.title,gog:game,
});
export const entryId=(entry:DashboardEntry)=>entry.key;
export const unifiedEntry=(entry:DashboardEntry):UnifiedLibraryGame=>
  entry.store==="steam"?fromSteamLibraryGame(entry.steam):fromGogLibraryGame(entry.gog);

const compareTitles=(a:DashboardEntry,b:DashboardEntry)=>
  a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:"base"})||
  a.key.localeCompare(b.key);

/** Steam has native metrics, GOG only has confirmed ownership. When sorting
 * by playtime/release/size/etc, leave games without those metrics after Steam
 * games instead of inventing times or disk usage. A-Z and Z-A sort together.
 */
export function combineDashboardEntries(
  steamSorted:readonly LibraryGame[],
  gogGames:readonly GogOwnedGame[],
  tabId:string,
  sort:HomeSort,
):DashboardEntry[]{
  const steam=tabId==="GOG"?[]:steamSorted.map(steamEntry);
  const gog=(tabId==="GOG"||tabId==="AllGames")?
    gogGames.map(gogEntry):[];
  if(sort==="alphabetical"||sort==="alphabetical-desc"){
    const result=[...steam,...gog].sort(compareTitles);
    return sort==="alphabetical-desc"?result.reverse():result;
  }
  return [...steam,...gog.sort(compareTitles)];
}

export function searchGogEntries(
  games:readonly GogOwnedGame[],query:string,source:SearchSource,
  install:SearchInstall,
):DashboardEntry[]{
  // Owned GOG products have UNKNOWN installation state until the dedicated
  // GOG installer/scanner is implemented. Never call them not-installed.
  if((source!=="all"&&source!=="gog")||install!=="all")return [];
  const prefix=normalizeSearchText(query);
  if(!prefix)return [];
  return games.filter(game=>normalizeSearchText(game.title).startsWith(prefix))
    .map(gogEntry).sort(compareTitles);
}

export function combineSearchEntries(
  steamSorted:readonly LibraryGame[],
  gogResults:readonly DashboardEntry[],
  sort:HomeSort,
):DashboardEntry[]{
  const steam=steamSorted.map(steamEntry);
  if(sort==="alphabetical"||sort==="alphabetical-desc"){
    const result=[...steam,...gogResults].sort(compareTitles);
    return sort==="alphabetical-desc"?result.reverse():result;
  }
  // Unknown cross-store metrics stay behind native Steam results.
  return [...steam,...gogResults];
}
