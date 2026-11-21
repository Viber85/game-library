/**
 * One-shot return destination for Game Details opened from this plugin.
 *
 * Steam's native app details B/Back sometimes navigates to /library/home
 * instead of returning to a Decky route. We remember the actual origin,
 * restore it once, and never touch Steam's global B handler or other games.
 * In-memory only: no account information is persisted or sent to a backend.
 */
export const HOME_ROUTE="/library/home";
export const DASHBOARD_ROUTE="/game-library/dashboard";
export const LIBRARY_ROUTE="/game-library/library";
export const APPEARANCE_ROUTE="/game-library/appearance";
export const SEARCH_ROUTE="/game-library/search";
export const COLLECTIONS_ROUTE="/game-library/collections";
export const TABS_ROUTE="/game-library/tabs";
export const PLUGIN_SETTINGS_ROUTE="/game-library/plugin-settings";

export type DetailsOriginRoute=
  typeof HOME_ROUTE|typeof DASHBOARD_ROUTE|typeof LIBRARY_ROUTE|typeof APPEARANCE_ROUTE|typeof SEARCH_ROUTE|typeof COLLECTIONS_ROUTE|typeof TABS_ROUTE|typeof PLUGIN_SETTINGS_ROUTE;

export interface GameDetailsOrigin {
  route:DetailsOriginRoute;
  tabId:string;
  gameId:number;
  viewAll:boolean;
  gridLimit:number;
  gridScrollTop:number;
  gridFocusIndex:number;
}

type SavedOrigin=GameDetailsOrigin & {armedAt:number};

const MAX_ORIGIN_AGE_MS=2*60*60*1000;
let pending:SavedOrigin|null=null;

const validRoute=(route:string):route is DetailsOriginRoute=>
  route===HOME_ROUTE||route===DASHBOARD_ROUTE||route===LIBRARY_ROUTE||route===APPEARANCE_ROUTE||route===SEARCH_ROUTE||route===COLLECTIONS_ROUTE||route===TABS_ROUTE||route===PLUGIN_SETTINGS_ROUTE;

function current():SavedOrigin|null{
  if(!pending)return null;
  if(Date.now()-pending.armedAt>MAX_ORIGIN_AGE_MS){
    pending=null;
    return null;
  }
  return pending;
}

/** Called immediately before the verified native Steam game-details Navigate. */
export function rememberDetailsOrigin(value:GameDetailsOrigin):void{
  if(!validRoute(value.route)||!Number.isSafeInteger(value.gameId)||
     value.gameId<=0||value.gameId>0xffffffff||
     typeof value.tabId!=="string"||value.tabId.length>180){
    return;
  }
  pending={
    route:value.route,
    tabId:value.tabId,
    gameId:value.gameId,
    viewAll:value.viewAll,
    gridLimit:Math.max(60,Math.min(10000,Math.floor(value.gridLimit)||60)),
    gridScrollTop:Number.isFinite(value.gridScrollTop)?
      Math.max(0,value.gridScrollTop):0,
    gridFocusIndex:Number.isSafeInteger(value.gridFocusIndex)?
      Math.max(0,value.gridFocusIndex):0,
    armedAt:Date.now(),
  };
}

/** When native Steam Back lands on Home, redirect ONLY if that is not origin. */
export function returnDestinationFromHome():DetailsOriginRoute|null{
  const origin=current();
  return origin&&origin.route!==HOME_ROUTE?origin.route:null;
}

/** Reading a snapshot must not mutate React render state (StrictMode-safe). */
export function peekDetailsOrigin(route:DetailsOriginRoute):GameDetailsOrigin|null{
  const origin=current();
  if(!origin||origin.route!==route)return null;
  const {armedAt:_ignored,...snapshot}=origin;
  return snapshot;
}

/** Consumed only when the original Dashboard route is actually mounted. */
export function consumeDetailsOrigin(route:DetailsOriginRoute):GameDetailsOrigin|null{
  const origin=current();
  if(!origin||origin.route!==route)return null;
  pending=null;
  const {armedAt:_ignored,...snapshot}=origin;
  return snapshot;
}

/** Drop pending return state whenever the Decky plugin itself unloads. */
export function clearDetailsOrigin():void{
  pending=null;
}
