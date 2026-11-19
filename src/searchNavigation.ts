/** Tiny session-only state: reopening Search after native Game Details
 * retains the query and filters. Nothing is persisted to disk or sent online.
 */
export const SEARCH_ROUTE="/game-library/search";
export type SearchBackRoute=
  "/library/home"|"/game-library/dashboard"|"/game-library/library"|"/game-library/appearance";
type SearchSelection={query:string;source:"all"|"steam"|"epic"|"gog"|"other";installed:"all"|"installed"|"not-installed"};
let origin:SearchBackRoute="/library/home";
let last:SearchSelection={query:"",source:"all",installed:"all"};
export function rememberSearchOrigin(route:string):void{
  if(route==="/library/home"||route==="/game-library/dashboard"||
     route==="/game-library/library"||route==="/game-library/appearance")origin=route;
}
export function searchBackRoute():SearchBackRoute{return origin;}
export function readSearchSelection():SearchSelection{return {...last};}
export function saveSearchSelection(next:SearchSelection):void{
  last={...next,query:next.query.slice(0,160)};
}
